const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const FileSystem = require('../../fileSystem');
const Languages = require('../../languages');
const Metadata = require('../../metadata');
const Config = require('../../main/config');
const StrUtils = require('../../utils/strUtils');
const FileChecker = FileSystem.FileChecker;
const FileReader = FileSystem.FileReader;
const FileWriter = FileSystem.FileWriter;
const Paths = FileSystem.Paths;
const Color = Output.Color;
const MetadataFactory = Metadata.Factory;
const MetadataTypeNames = Metadata.MetadataTypes;
const XMLParser = Languages.XMLParser;
const MetadataCompressor = Metadata.MetadataCompressor;
const MetadataConnection = Metadata.Connection;
const CustomApplicationUtils = Metadata.CustomApplicationUtils;
const ProfileUtils = Metadata.ProfileUtils;
const PermissionSetUtils = Metadata.PermissionSetUtils;
const MetadataUtils = Metadata.Utils;

exports.createCommand = function (program) {
    program
        .command('metadata:local:repair')
        .description('Repair local project such as dependencies on files and metadata types.')
        .option('-r, --root <path/to/project/root>', 'Path to project root', './')
        .option('-a, --all', 'Repair al metadata types')
        .option('-t, --type <MetadataTypeNames>', 'Repair specified metadata types. You can choose single type or a list separated by commas. This option does not take effet if select repair all')
        .option('-c, --compress', 'Add this option for compress modifieds files for repair operation.', false)
        .action(function (args) {
            run(args);
        });
}

function run(args) {
    if (hasEmptyArgs(args)) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS));
        return;
    }
    try {
        args.root = Paths.getAbsolutePath(args.root);
    } catch (error) {
        Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --root path. Select a valid path'));
        return;
    }
    if (args.all == undefined && args.type === undefined) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "You must select repair all or repair specific types"));
        return;
    }
    if (!FileChecker.isSFDXRootPath(args.root)) {
        Output.Printer.printError(Response.error(ErrorCodes.PROJECT_NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND.message + args.root));
        return;
    }
    repairDependencies(args).then(function () {
        Output.Printer.printSuccess(Response.success("Repair metadata finished successfully", {}));
    }).catch(function (error) {
        Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
    });
}

function hasEmptyArgs(args) {
    return args.root === undefined && args.all === undefined && args.type === undefined && args.type === undefined;
}

function repairDependencies(args) {
    return new Promise(async function (resolve, reject) {
        try {
            let username = await Config.getAuthUsername(args.root);
            let metadataTypes = await MetadataConnection.getMetadataTypesFromOrg(username, args.root, { forceDownload: true });
            let folderMetadataMap = MetadataFactory.createFolderMetadataMap(metadataTypes);
            let metadataFromFileSystem = MetadataFactory.getMetadataObjectsFromFileSystem(folderMetadataMap, args.root);
            let metadata = {};
            if (args.all) {
                metadata = metadataFromFileSystem;
            } else if (args.type) {
                let types = [args.type];
                if (args.type.indexOf(' ') !== -1)
                    types = args.type.split(' ');
                Object.keys(metadataFromFileSystem).forEach(function (key) {
                    if (types.includes(key))
                        metadata[key] = metadataFromFileSystem[key];
                });
            }
            Object.keys(metadata).forEach(function (key) {
                let typeToProcess = metadata[key];
                if (key === MetadataTypeNames.CUSTOM_APPLICATION) {
                    repairCustomApplicationsDependencies(typeToProcess, typeToProcess.path, metadata, args.compress);
                } else if (key === MetadataTypeNames.PROFILE) {
                    repairProfileDependencies(typeToProcess, typeToProcess.path, metadata, args.compress);
                } else if (key === MetadataTypeNames.PERMISSION_SET) {
                    repairPermissionSetDependencies(typeToProcess, typeToProcess.path, metadata, args.compress);
                }
            });
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

function repairCustomApplicationsDependencies(customApps, folder, metadataFromFileSystem, compress) {
    let customObjects = metadataFromFileSystem[MetadataTypeNames.CUSTOM_OBJECT].childs;
    let profiles = metadataFromFileSystem[MetadataTypeNames.PROFILE].childs;
    let recordTypes = metadataFromFileSystem[MetadataTypeNames.RECORD_TYPE].childs;
    let tabs = metadataFromFileSystem[MetadataTypeNames.TAB].childs;
    Object.keys(customApps.childs).forEach(function (key) {
        let app = customApps.childs[key];
        let filePath = folder + '/' + app.name + '.app-meta.xml';
        let root = XMLParser.parseXML(FileReader.readFileSync(filePath), true);
        let customApp = CustomApplicationUtils.createCustomApplication(root.CustomApplication);
        let actionsToRemove = [];
        let profileActionsToRemove = [];
        let tabsToRemove = [];
        let mappingsToRemove = [];
        let index = 0;
        let anyRemove = false;
        for (let actionOverride of customApp.actionOverrides) {
            if (actionOverride.pageOrSobjectType !== 'standard-home' && actionOverride.pageOrSobjectType !== 'record-home') {
                if (actionOverride.pageOrSobjectType && !customObjects[actionOverride.pageOrSobjectType])
                    actionsToRemove.push(index);
            }
            index++;
        }
        actionsToRemove = actionsToRemove.reverse();
        for (let actionIndex of actionsToRemove) {
            customApp.actionOverrides.splice(actionIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (let profileAction of customApp.profileActionOverrides) {
            if (profileAction.pageOrSobjectType !== 'standard-home' && profileAction.pageOrSobjectType !== 'record-home') {
                if (!customObjects[profileAction.pageOrSobjectType] && !profileActionsToRemove.includes(index))
                    profileActionsToRemove.push(index);
            }
            if (profileAction.pageOrSobjectType !== 'standard-home' && profileAction.pageOrSobjectType !== 'record-home') {
                let rtName = profileAction.recordType.substring((profileAction.pageOrSobjectType + '.').length);
                if ((!recordTypes[profileAction.pageOrSobjectType] || !recordTypes[profileAction.pageOrSobjectType].childs[rtName]) && !profileActionsToRemove.includes(index))
                    profileActionsToRemove.push(index);
            }
            if (!profiles[profileAction.profile] && !profileActionsToRemove.includes(index))
                profileActionsToRemove.push(index);
            index++;
        }
        profileActionsToRemove = profileActionsToRemove.reverse();
        for (let actionIndex of profileActionsToRemove) {
            customApp.profileActionOverrides.splice(actionIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (let tab of customApp.tabs) {
            if (!tabs[tab] && !tabsToRemove.includes(index) && tab.indexOf('standard-') === -1)
                tabsToRemove.push(index);
            index++;
        }
        tabsToRemove = tabsToRemove.reverse();
        for (let tabIndex of tabsToRemove) {
            customApp.tabs = customApp.tabs.splice(tabIndex, tabIndex + 1);
            anyRemove = true;
        }
        if (customApp.workspaceConfig && customApp.workspaceConfig.mappings) {
            customApp.workspaceConfig.mappings = MetadataUtils.forceArray(customApp.workspaceConfig.mappings);
            index = 0;
            for (const mapping of customApp.workspaceConfig.mappings) {
                if (!tabs[mapping.tab] && !mappingsToRemove.includes(index) && mapping.tab.indexOf('standard-') === -1)
                    mappingsToRemove.push(index);
                index++;
            }
            mappingsToRemove = mappingsToRemove.reverse();
            for (let mappingIndex of mappingsToRemove) {
                customApp.workspaceConfig.mappings = customApp.workspaceConfig.mappings.splice(mappingIndex, mappingIndex + 1);
                anyRemove = true;
            }
        }
        if (anyRemove) {
            root.CustomApplication = customApp;
            if (compress) {
                content = MetadataCompressor.compressAsJSON(root);
                if (!content)
                    content = XMLParser.toXML(root);
            } else {
                content = XMLParser.toXML(root);
            }
            FileWriter.createFileSync(filePath, content);
        }
    });
}

function repairProfileDependencies(profiles, folder, metadataFromFileSystem, compress) {
    let customApps = metadataFromFileSystem[MetadataTypeNames.CUSTOM_APPLICATION].childs;
    let apexClasses = metadataFromFileSystem[MetadataTypeNames.APEX_CLASS].childs;
    let customObjects = metadataFromFileSystem[MetadataTypeNames.CUSTOM_OBJECT].childs;
    let customPermissions = metadataFromFileSystem[MetadataTypeNames.CUSTOM_PERMISSION].childs;
    let customFields = metadataFromFileSystem[MetadataTypeNames.CUSTOM_FIELDS].childs;
    let flows = metadataFromFileSystem[MetadataTypeNames.FLOWS].childs;
    let layouts = metadataFromFileSystem[MetadataTypeNames.LAYOUT].childs;
    let apexPages = metadataFromFileSystem[MetadataTypeNames.APEX_PAGE].childs;
    let recordTypes = metadataFromFileSystem[MetadataTypeNames.RECORD_TYPE].childs;
    let tabs = metadataFromFileSystem[MetadataTypeNames.TAB].childs;
    let customMetadata = metadataFromFileSystem[MetadataTypeNames.CUSTOM_METADATA].childs;
    Object.keys(profiles.childs).forEach(function (key) {
        let profile = profiles.childs[key];
        let filePath = folder + '/' + profile.name + '.profile-meta.xml';
        let root = XMLParser.parseXML(FileReader.readFileSync(filePath), true);
        let profileXML = ProfileUtils.createProfile(root.Profile);
        let index = 0;
        let anyRemove = false;
        let appsToRemove = [];
        let classesToRemote = [];
        let customPermissionToRemove = [];
        let fieldsToRemove = [];
        let flowsToRemove = [];
        let layoutsToRemove = [];
        let objectsToRemove = [];
        let pagesToRemove = [];
        let recordTypesToRemove = [];
        let tabsToRemove = [];
        let customMetadataToRemove = [];
        let customSettingsToRemove = [];
        index = 0;
        for (const appVisibility of profileXML.applicationVisibilities) {
            if (!customApps[appVisibility.application] && !appsToRemove.includes(index))
                appsToRemove.push(index);
            index++;
        }
        appsToRemove = appsToRemove.reverse();
        for (let appIndex of appsToRemove) {
            profileXML.applicationVisibilities.splice(appIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const classAccess of profileXML.classAccesses) {
            if (!apexClasses[classAccess.apexClass] && !classesToRemote.includes(index))
                classesToRemote.push(index);
            index++;
        }
        classesToRemote = classesToRemote.reverse();
        for (let classIndex of classesToRemote) {
            profileXML.classAccesses.splice(classIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const customMetadataAccess of profileXML.customMetadataTypeAccesses) {
            if (!customMetadata[customMetadataAccess.name] && !customMetadataToRemove.includes(index))
                customMetadataToRemove.push(index);
            index++;
        }
        customMetadataToRemove = customMetadataToRemove.reverse();
        for (let customMetadataIndex of customMetadataToRemove) {
            profileXML.customMetadataTypeAccesses.splice(customMetadataIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const customPermission of profileXML.customPermissions) {
            if (!customPermissions[customPermission.name] && !customPermissionToRemove.includes(index))
                customPermissionToRemove.push(index);
            index++;
        }
        customPermissionToRemove = customPermissionToRemove.reverse();
        for (let permissionIndex of customPermissionToRemove) {
            profileXML.customPermissions.splice(permissionIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const customSettingAccess of profileXML.customSettingAccesses) {
            if (!customObjects[customSettingAccess.name] && !customSettingsToRemove.includes(index))
                customSettingsToRemove.push(index);
            index++;
        }
        customSettingsToRemove = customSettingsToRemove.reverse();
        for (let customSettingIndex of customSettingsToRemove) {
            profileXML.customSettingAccesses.splice(customSettingIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const fieldPermission of profileXML.fieldPermissions) {
            let sObject = fieldPermission.field.substring(0, fieldPermission.field.indexOf('.'));
            let field = fieldPermission.field.substring(fieldPermission.field.indexOf('.') + 1);
            let sObjectAux;
            if (sObject === 'Task')
                sObjectAux = 'Activity';
            if (sObjectAux) {
                let inObj = true;
                let inAux = true;
                if (!customFields[sObjectAux] || !customFields[sObjectAux].childs[field])
                    inAux = false;
                if (!customFields[sObject] || !customFields[sObject].childs[field])
                    inObj = false;
                if (!inAux && !inObj && !fieldsToRemove.includes(index)) {
                    fieldsToRemove.push(index);
                }
            } else {
                if ((!customFields[sObject] || !customFields[sObject].childs[field]) && !fieldsToRemove.includes(index))
                    fieldsToRemove.push(index);
            }
            index++;
        }
        fieldsToRemove = fieldsToRemove.reverse();
        for (let fieldIndex of fieldsToRemove) {
            profileXML.fieldPermissions.splice(fieldIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const flowAccess of profileXML.flowAccesses) {
            if (!flows[flowAccess.flow] && !flowsToRemove.includes(index))
                flowsToRemove.push(index);
            index++;
        }
        flowsToRemove = flowsToRemove.reverse();
        for (let flowIndex of flowsToRemove) {
            profileXML.flowAccesses.splice(flowIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const layoutAssignment of profileXML.layoutAssignments) {
            let sObject = layoutAssignment.layout.substring(0, layoutAssignment.layout.indexOf('-'));
            let layout = layoutAssignment.layout.substring(layoutAssignment.layout.indexOf('-') + 1);
            if ((!layouts[sObject] || !layouts[sObject].childs[layout]) && !layoutsToRemove.includes(index))
                layoutsToRemove.push(index);
            index++;
        }
        layoutsToRemove = layoutsToRemove.reverse();
        for (let layoutIndex of layoutsToRemove) {
            profileXML.layoutAssignments.splice(layoutIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const objectPermission of profileXML.objectPermissions) {
            if (!customObjects[objectPermission.object] && !objectsToRemove.includes(index))
                objectsToRemove.push(index);
            index++;
        }
        objectsToRemove = objectsToRemove.reverse();
        for (let objectIndex of objectsToRemove) {
            profileXML.objectPermissions.splice(objectIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const pageAccess of profileXML.pageAccesses) {
            if (!apexPages[pageAccess.apexPage] && !pagesToRemove.includes(index))
                pagesToRemove.push(index);
            index++;
        }
        pagesToRemove = pagesToRemove.reverse();
        for (let pageIndex of pagesToRemove) {
            profileXML.pageAccesses.splice(pageIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const recordTypeVisibility of profileXML.recordTypeVisibilities) {
            let sObject = recordTypeVisibility.recordType.substring(0, recordTypeVisibility.recordType.indexOf('.'));
            let recordType = recordTypeVisibility.recordType.substring(recordTypeVisibility.recordType.indexOf('.') + 1);
            if ((!recordTypes[sObject] || !recordTypes[sObject].childs[recordType]) && !recordTypesToRemove.includes(index))
                recordTypesToRemove.push(index);
            index++;
        }
        recordTypesToRemove = recordTypesToRemove.reverse();
        for (let rtIndex of recordTypesToRemove) {
            profileXML.recordTypeVisibilities.splice(rtIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const tabVisibility of profileXML.tabVisibilities) {
            if (tabVisibility.tab.indexOf('standard-') !== -1) {
                let sObj = StrUtils.replace(tabVisibility.tab, 'standard-', '');
                if (!customObjects[sObj] && !tabsToRemove.includes(index))
                    tabsToRemove.push(index);
            } else {
                if (!tabs[tabVisibility.tab] && !tabsToRemove.includes(index))
                    tabsToRemove.push(index);
            }
            index++;
        }
        tabsToRemove = tabsToRemove.reverse();
        for (let tabIndex of tabsToRemove) {
            profileXML.tabVisibilities.splice(tabIndex, 1);
            anyRemove = true;
        }
        if (anyRemove) {
            root.Profile = profileXML;
            if (compress) {
                content = MetadataCompressor.compressAsJSON(root);
                if (!content)
                    content = XMLParser.toXML(root);
            } else {
                content = XMLParser.toXML(root);
            }
            FileWriter.createFileSync(filePath, content);
        }
    });
}

function repairPermissionSetDependencies(permissionSets, folder, metadataFromFileSystem, compress) {
    let customApps = metadataFromFileSystem[MetadataTypeNames.CUSTOM_APPLICATION].childs;
    let apexClasses = metadataFromFileSystem[MetadataTypeNames.APEX_CLASS].childs;
    let customObjects = metadataFromFileSystem[MetadataTypeNames.CUSTOM_OBJECT].childs;
    let customPermissions = metadataFromFileSystem[MetadataTypeNames.CUSTOM_PERMISSION].childs;
    let customFields = metadataFromFileSystem[MetadataTypeNames.CUSTOM_FIELDS].childs;
    let apexPages = metadataFromFileSystem[MetadataTypeNames.APEX_PAGE].childs;
    let recordTypes = metadataFromFileSystem[MetadataTypeNames.RECORD_TYPE].childs;
    let tabs = metadataFromFileSystem[MetadataTypeNames.TAB].childs;
    let customMetadata = metadataFromFileSystem[MetadataTypeNames.CUSTOM_METADATA].childs;
    Object.keys(permissionSets.childs).forEach(function (key) {
        let permissionSet = permissionSets.childs[key];
        let filePath = folder + '/' + permissionSet.name + '.permissionset-meta.xml';
        let root = XMLParser.parseXML(FileReader.readFileSync(filePath), true);
        let permissionSetXML = PermissionSetUtils.createPermissionSet(root.PermissionSet);
        let index = 0;
        let anyRemove = false;
        let appsToRemove = [];
        let classesToRemote = [];
        let customPermissionToRemove = [];
        let fieldsToRemove = [];
        let objectsToRemove = [];
        let pagesToRemove = [];
        let recordTypesToRemove = [];
        let tabsToRemove = [];
        let customMetadataToRemove = [];
        let customSettingsToRemove = [];
        index = 0;
        for (const appVisibility of permissionSetXML.applicationVisibilities) {
            if (!customApps[appVisibility.application] && !appsToRemove.includes(index))
                appsToRemove.push(index);
            index++;
        }
        appsToRemove = appsToRemove.reverse();
        for (let appIndex of appsToRemove) {
            permissionSetXML.applicationVisibilities.splice(appIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const classAccess of permissionSetXML.classAccesses) {
            if (!apexClasses[classAccess.apexClass] && !classesToRemote.includes(index))
                classesToRemote.push(index);
            index++;
        }
        classesToRemote = classesToRemote.reverse();
        for (let classIndex of classesToRemote) {
            permissionSetXML.classAccesses.splice(classIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const customMetadataAccess of permissionSetXML.customMetadataTypeAccesses) {
            if (!customMetadata[customMetadataAccess.name] && !customMetadataToRemove.includes(index))
                customMetadataToRemove.push(index);
            index++;
        }
        customMetadataToRemove = customMetadataToRemove.reverse();
        for (let customMetadataIndex of customMetadataToRemove) {
            permissionSetXML.customMetadataTypeAccesses.splice(customMetadataIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const customPermission of permissionSetXML.customPermissions) {
            if (!customPermissions[customPermission.name] && !customPermissionToRemove.includes(index))
                customPermissionToRemove.push(index);
            index++;
        }
        customPermissionToRemove = customPermissionToRemove.reverse();
        for (let permissionIndex of customPermissionToRemove) {
            permissionSetXML.customPermissions.splice(permissionIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const customSettingAccess of permissionSetXML.customSettingAccesses) {
            if (!customObjects[customSettingAccess.name] && !customSettingsToRemove.includes(index))
                customSettingsToRemove.push(index);
            index++;
        }
        customSettingsToRemove = customSettingsToRemove.reverse();
        for (let customSettingIndex of customSettingsToRemove) {
            permissionSetXML.customSettingAccesses.splice(customSettingIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const fieldPermission of permissionSetXML.fieldPermissions) {
            let sObject = fieldPermission.field.substring(0, fieldPermission.field.indexOf('.'));
            let field = fieldPermission.field.substring(fieldPermission.field.indexOf('.') + 1);
            let sObjectAux;
            if (sObject === 'Task')
                sObjectAux = 'Activity';
            if (sObjectAux) {
                let inObj = true;
                let inAux = true;
                if (!customFields[sObjectAux] || !customFields[sObjectAux].childs[field])
                    inAux = false;
                if (!customFields[sObject] || !customFields[sObject].childs[field])
                    inObj = false;
                if (!inAux && !inObj && !fieldsToRemove.includes(index)) {
                    fieldsToRemove.push(index);
                }
            } else {
                if ((!customFields[sObject] || !customFields[sObject].childs[field]) && !fieldsToRemove.includes(index))
                    fieldsToRemove.push(index);
            }
            index++;
        }
        fieldsToRemove = fieldsToRemove.reverse();
        for (let fieldIndex of fieldsToRemove) {
            permissionSetXML.fieldPermissions.splice(fieldIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const objectPermission of permissionSetXML.objectPermissions) {
            if (!customObjects[objectPermission.object] && !objectsToRemove.includes(index))
                objectsToRemove.push(index);
            index++;
        }
        objectsToRemove = objectsToRemove.reverse();
        for (let objectIndex of objectsToRemove) {
            permissionSetXML.objectPermissions.splice(objectIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const pageAccess of permissionSetXML.pageAccesses) {
            if (!apexPages[pageAccess.apexPage] && !pagesToRemove.includes(index))
                pagesToRemove.push(index);
            index++;
        }
        pagesToRemove = pagesToRemove.reverse();
        for (let pageIndex of pagesToRemove) {
            permissionSetXML.pageAccesses.splice(pageIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const recordTypeVisibility of permissionSetXML.recordTypeVisibilities) {
            let sObject = recordTypeVisibility.recordType.substring(0, recordTypeVisibility.recordType.indexOf('.'));
            let recordType = recordTypeVisibility.recordType.substring(recordTypeVisibility.recordType.indexOf('.') + 1);
            if ((!recordTypes[sObject] || !recordTypes[sObject].childs[recordType]) && !recordTypesToRemove.includes(index))
                recordTypesToRemove.push(index);
            index++;
        }
        recordTypesToRemove = recordTypesToRemove.reverse();
        for (let rtIndex of recordTypesToRemove) {
            permissionSetXML.recordTypeVisibilities.splice(rtIndex, 1);
            anyRemove = true;
        }
        index = 0;
        for (const tabVisibility of permissionSetXML.tabSettings) {
            if (tabVisibility.tab.indexOf('standard-') !== -1) {
                let sObj = StrUtils.replace(tabVisibility.tab, 'standard-', '');
                if (!customObjects[sObj] && !tabsToRemove.includes(index))
                    tabsToRemove.push(index);
            } else {
                if (!tabs[tabVisibility.tab] && !tabsToRemove.includes(index))
                    tabsToRemove.push(index);
            }
            index++;
        }
        tabsToRemove = tabsToRemove.reverse();
        for (let tabIndex of tabsToRemove) {
            permissionSetXML.tabSettings.splice(tabIndex, 1);
            anyRemove = true;
        }
        if (anyRemove) {
            root.PermissionSet = permissionSetXML;
            if (compress) {
                content = MetadataCompressor.compressAsJSON(root);
                if (!content)
                    content = XMLParser.toXML(root);
            } else {
                content = XMLParser.toXML(root);
            }
            FileWriter.createFileSync(filePath, content);
        }
    });
}