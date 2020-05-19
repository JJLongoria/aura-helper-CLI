const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const FileSystem = require('../../fileSystem');
const Languages = require('../../languages');
const Metadata = require('../../metadata');
const Config = require('../../main/config');
const StrUtils = require('../../utils/strUtils');
const Utils = require('./utils');
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

const TYPES_FOR_REPAIR_DATA = {
    CustomApplication: {
        actionOverrides: "pageOrSobjectType",
        tabs: "",
        mappings: "tab"
    },
    Profile: {
        applicationVisibilities: "application",
        classAccesses: "apexClass",
        customMetadataTypeAccesses: "name",
        customPermissions: "name",
        customSettingAccesses: "name",
        fieldPermissions: "field",
        flowAccesses: "flow",
        layoutAssignments: "layout",
        objectPermissions: "object",
        pageAccesses: "apexPage",
        recordTypeVisibilities: "recordType",
        tabVisibilities: "tab",
    },
    PermissionSet: {
        applicationVisibilities: "application",
        classAccesses: "apexClass",
        customMetadataTypeAccesses: "name",
        customPermissions: "name",
        customSettingAccesses: "name",
        fieldPermissions: "field",
        objectPermissions: "object",
        pageAccesses: "apexPage",
        recordTypeVisibilities: "recordType",
        tabSettings: "tab",
    }
};

exports.createCommand = function (program) {
    program
        .command('metadata:local:repair')
        .description('Repair local project such as dependencies on files and metadata types.')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-a, --all', 'Repair all supported metadata types. ' + Object.keys(TYPES_FOR_REPAIR_DATA).join(', '))
        .option('-t, --type <MetadataTypeNames>', 'Repair specified metadata types. You can choose single type or a list separated by commas,  also you can choose to repair a specified objects like "MetadataTypeAPIName:MetadataObjectAPIName". For example, "CustomApplication:AppName1" for repair only AppName1 Custom App. This option does not take effet if select repair all')
        .option('-o, --only-check', 'If you select this options, the command not repair dependencies, instead return the errors on the files for repair manually', false)
        .option('-c, --compress', 'Add this option for compress modifieds files for repair operation.', false)
        .option('-p, --progress [format]', 'Option for report the command progress. Available formats: ' + Utils.getProgressAvailableTypes().join(','))
        .option('-s, --send-to <path/to/output/file>', 'If you choose --only-check, you can redirect the output to a file')
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args) {
            run(args);
        });
}

function run(args) {
    Output.Printer.setColorized(args.beautify);
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
    if (args.progress) {
        if (!Utils.getProgressAvailableTypes().includes(args.progress)) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --progress value. Please, select any  of this vales: " + Utils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
    let types = {};
    if (args.all) {
        Object.keys(TYPES_FOR_REPAIR_DATA).forEach(function (key) {
            types[key] = {};
            types[key]['*'] = ['*'];
        });
    } else if (args.type) {
        types = Utils.getAdvanceTypes(args.type);
    }
    if (args.onlyCheck && args.sendTo) {
        try {
            args.sendTo = Paths.getAbsolutePath(args.sendTo);
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --send-to path. Select a valid path'));
            return;
        }
    }
    repairDependencies(args, types).then(function (result) {
        if (args.onlyCheck) {
            if (args.sendTo) {
                let baseDir = Paths.getFolderPath(args.sendTo);
                if (!FileChecker.isExists(baseDir))
                    FileWriter.createFolderSync(baseDir);
                FileWriter.createFileSync(args.sendTo, JSON.stringify(result, null, 2));
                Output.Printer.printSuccess(Response.success("Output saved in: " + args.sendTo));
            } else {
                Output.Printer.printSuccess(Response.success("The next metadata types has dependencies errors", result));
            }
        } else {
            Output.Printer.printSuccess(Response.success("Repair metadata finished successfully"));
        }
    }).catch(function (error) {
        Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
    });
}

function hasEmptyArgs(args) {
    return args.root === undefined && args.all === undefined && args.sendTo === undefined && args.type === undefined && args.compress === undefined && args.onlyCheck === undefined && args.progress === undefined && args.beautify === undefined;
}

function repairDependencies(args, types) {
    return new Promise(async function (resolve, reject) {
        try {
            let username = await Config.getAuthUsername(args.root);
            let metadataTypes = await MetadataConnection.getMetadataTypes(username, args.root, { forceDownload: false });
            let folderMetadataMap = MetadataFactory.createFolderMetadataMap(metadataTypes);
            let metadataFromFileSystem = MetadataFactory.getMetadataObjectsFromFileSystem(folderMetadataMap, args.root);
            let results = {};
            Object.keys(types).forEach(function (key) {
                let typeToProcess = metadataFromFileSystem[key];
                if (typeToProcess) {
                    Object.keys(typeToProcess.childs).forEach(function (childKey) {
                        let objectToProcess = typeToProcess.childs[childKey];
                        if (types[key][childKey] || types[key]['*']) {
                            let result = repairTypeDependencies(args, typeToProcess, objectToProcess, metadataFromFileSystem);
                            if (result && Object.keys(result).length > 0) {
                                if (!results[key])
                                    results[key] = [];
                                results[key].push({
                                    object: childKey,
                                    deleted: result,
                                });
                            }
                        }
                    });
                }
            });
            if (args.onlyCheck)
                resolve(processErrors(args, results, metadataFromFileSystem));
            else
                resolve();
        } catch (error) {
            reject(error);
        }
    });
}

function repairTypeDependencies(args, typeToProcess, objectToProcess, allTypes) {
    let result;
    if (typeToProcess.name === MetadataTypeNames.CUSTOM_APPLICATION) {
        result = repairCustomApplication(args, typeToProcess, objectToProcess, allTypes);
    } else if (typeToProcess.name === MetadataTypeNames.PROFILE) {
        result = repairProfile(args, typeToProcess, objectToProcess, allTypes);
    } else if (typeToProcess.name === MetadataTypeNames.PERMISSION_SET) {
        result = repairPermissionSet(args, typeToProcess, objectToProcess, allTypes);
    }
    return result;
}

function repairCustomApplication(args, typeToProcess, objectToProcess, allTypes) {
    if (args.progress) {
        Output.Printer.printProgress(Response.progress(undefined, 'Processing object ' + objectToProcess.name + ' from ' + typeToProcess.name, args.progress));
    }
    let result = {};
    let customObjects = (allTypes[MetadataTypeNames.CUSTOM_OBJECT] && allTypes[MetadataTypeNames.CUSTOM_OBJECT].childs) ? allTypes[MetadataTypeNames.CUSTOM_OBJECT].childs : {};
    let profiles = (allTypes[MetadataTypeNames.PROFILE] && allTypes[MetadataTypeNames.PROFILE].childs) ? allTypes[MetadataTypeNames.PROFILE].childs : {};
    let recordTypes = (allTypes[MetadataTypeNames.RECORD_TYPE] && allTypes[MetadataTypeNames.RECORD_TYPE].childs) ? allTypes[MetadataTypeNames.RECORD_TYPE].childs : {};
    let tabs = (allTypes[MetadataTypeNames.TAB] && allTypes[MetadataTypeNames.TAB].childs) ? allTypes[MetadataTypeNames.TAB].childs : {};
    let root = XMLParser.parseXML(FileReader.readFileSync(objectToProcess.path), true);
    let customApp = CustomApplicationUtils.createCustomApplication(root.CustomApplication);
    let actionsToKeep = [];
    let profileActionToKeep = [];
    let tabsToKeep = [];
    let mappingsToKeep = [];
    for (let actionOverride of customApp.actionOverrides) {
        if (actionOverride.pageOrSobjectType !== 'standard-home' && actionOverride.pageOrSobjectType !== 'record-home' && actionOverride.pageOrSobjectType && !customObjects[actionOverride.pageOrSobjectType]) {
            if (!result['actionOverrides'])
                result['actionOverrides'] = [];
            result['actionOverrides'].push({ field: 'pageOrSobjectType', element: actionOverride });
        } else {
            actionsToKeep.push(actionOverride);
        }
    }
    customApp.actionOverrides = actionsToKeep;
    for (let profileAction of customApp.profileActionOverrides) {
        if (profileAction.pageOrSobjectType !== 'standard-home' && profileAction.pageOrSobjectType !== 'record-home') {
            let rtName = profileAction.recordType.substring((profileAction.pageOrSobjectType + '.').length);
            if (!customObjects[profileAction.pageOrSobjectType] || !recordTypes[profileAction.pageOrSobjectType] || !recordTypes[profileAction.pageOrSobjectType].childs[rtName]) {
                if (!result['profileActionOverrides'])
                    result['profileActionOverrides'] = [];
                result['profileActionOverrides'].push({ field: 'pageOrSobjectType', element: profileAction });
            } else if (!profiles[profileAction.profile]) {
                if (!result['profileActionOverrides'])
                    result['profileActionOverrides'] = [];
                result['profileActionOverrides'].push({ field: 'profile', element: profileAction });
            } else {
                profileActionToKeep.push(profileAction);
            }
        } else {
            profileActionToKeep.push(profileAction);
        }
    }
    customApp.profileActionOverrides = profileActionToKeep;
    for (let tab of customApp.tabs) {
        if (!tabs[tab] && tab.indexOf('standard-') === -1) {
            if (!result['tabs'])
                result['tabs'] = [];
            result['tabs'].push({ field: '', element: tab });
        } else {
            tabsToKeep.push(tab);
        }
    }
    if (customApp.workspaceConfig && customApp.workspaceConfig.mappings) {
        customApp.workspaceConfig.mappings = MetadataUtils.forceArray(customApp.workspaceConfig.mappings);
        for (const mapping of customApp.workspaceConfig.mappings) {
            if (!tabs[mapping.tab] && mapping.tab.indexOf('standard-') === -1) {
                if (!result['mappings'])
                    result['mappings'] = [];
                result['mappings'].push({ field: 'tab', element: mapping });
            } else {
                mappingsToKeep.push(mapping);
            }
        }
        customApp.workspaceConfig.mappings = mappingsToKeep;
    }
    if (Object.keys(result).length > 0 && !args.onlyCheck) {
        root.CustomApplication = customApp;
        if (args.compress) {
            content = MetadataCompressor.compressAsJSON(root);
            if (!content)
                content = XMLParser.toXML(root);
        } else {
            content = XMLParser.toXML(root);
        }
        FileWriter.createFileSync(objectToProcess.path, content);
    }
    return result;
}

function repairProfile(args, typeToProcess, objectToProcess, allTypes) {
    if (args.progress) {
        Output.Printer.printProgress(Response.progress(undefined, 'Processing object ' + objectToProcess.name + ' from ' + typeToProcess.name, args.progress));
    }
    let result = {};
    let customApps = (allTypes[MetadataTypeNames.CUSTOM_APPLICATION] && allTypes[MetadataTypeNames.CUSTOM_APPLICATION].childs) ? allTypes[MetadataTypeNames.CUSTOM_APPLICATION].childs : {};
    let apexClasses = (allTypes[MetadataTypeNames.APEX_CLASS] && allTypes[MetadataTypeNames.APEX_CLASS].childs) ? allTypes[MetadataTypeNames.APEX_CLASS].childs : {};
    let customObjects = (allTypes[MetadataTypeNames.CUSTOM_OBJECT] && allTypes[MetadataTypeNames.CUSTOM_OBJECT].childs) ? allTypes[MetadataTypeNames.CUSTOM_OBJECT].childs : {};
    let customPermissions = (allTypes[MetadataTypeNames.CUSTOM_PERMISSION] && allTypes[MetadataTypeNames.CUSTOM_PERMISSION].childs) ? allTypes[MetadataTypeNames.CUSTOM_PERMISSION].childs : {};
    let customFields = (allTypes[MetadataTypeNames.CUSTOM_FIELDS] && allTypes[MetadataTypeNames.CUSTOM_FIELDS].childs) ? allTypes[MetadataTypeNames.CUSTOM_FIELDS].childs : {};
    let flows = (allTypes[MetadataTypeNames.FLOWS] && allTypes[MetadataTypeNames.FLOWS].childs) ? allTypes[MetadataTypeNames.FLOWS].childs : {};
    let layouts = (allTypes[MetadataTypeNames.LAYOUT] && allTypes[MetadataTypeNames.LAYOUT].childs) ? allTypes[MetadataTypeNames.LAYOUT].childs : {};
    let apexPages = (allTypes[MetadataTypeNames.APEX_PAGE] && allTypes[MetadataTypeNames.APEX_PAGE].childs) ? allTypes[MetadataTypeNames.APEX_PAGE].childs : {};
    let recordTypes = (allTypes[MetadataTypeNames.RECORD_TYPE] && allTypes[MetadataTypeNames.RECORD_TYPE].childs) ? allTypes[MetadataTypeNames.RECORD_TYPE].childs : {};
    let tabs = (allTypes[MetadataTypeNames.TAB] && allTypes[MetadataTypeNames.TAB].childs) ? allTypes[MetadataTypeNames.TAB].childs : {};
    let customMetadata = (allTypes[MetadataTypeNames.CUSTOM_METADATA] && allTypes[MetadataTypeNames.CUSTOM_METADATA].childs) ? allTypes[MetadataTypeNames.CUSTOM_METADATA].childs : {};
    let root = XMLParser.parseXML(FileReader.readFileSync(objectToProcess.path), true);
    let profile = ProfileUtils.createProfile(root.Profile);
    let appsToKeep = [];
    let classesToKeep = [];
    let customPermissionsToKeep = [];
    let fieldToKeep = [];
    let flowsToKeep = [];
    let layoutsToKeep = [];
    let objectsToKeep = [];
    let pagesToKeep = [];
    let recordTypesToKeep = [];
    let tabsToKeep = [];
    let customMetadataToKeep = [];
    let customSettingsToKeep = [];
    for (const appVisibility of profile.applicationVisibilities) {
        if (!customApps[appVisibility.application]) {
            if (!result['applicationVisibilities'])
                result['applicationVisibilities'] = [];
            result['applicationVisibilities'].push({ field: 'application', element: appVisibility });
        } else {
            appsToKeep.push(appVisibility);
        }
    }
    profile.applicationVisibilities = appsToKeep;
    for (const classAccess of profile.classAccesses) {
        if (!apexClasses[classAccess.apexClass]) {
            if (!result['classAccesses'])
                result['classAccesses'] = [];
            result['classAccesses'].push(classAccess);
        } else {
            classesToKeep.push(classAccess);
        }
    }
    profile.classAccesses = classesToKeep;
    for (const customMetadataAccess of profile.customMetadataTypeAccesses) {
        if (!customMetadata[customMetadataAccess.name]) {
            if (!result['customMetadataTypeAccesses'])
                result['customMetadataTypeAccesses'] = [];
            result['customMetadataTypeAccesses'].push({ field: 'name', element: customMetadataAccess });
        } else {
            customMetadataToKeep.push(customMetadataAccess);
        }
    }
    profile.customMetadataTypeAccesses = customMetadataToKeep;
    for (const customPermission of profile.customPermissions) {
        if (!customPermissions[customPermission.name]) {
            if (!result['customPermissions'])
                result['customPermissions'] = [];
            result['customPermissions'].push({ field: 'name', element: customPermission });
        } else {
            customPermissionsToKeep.push(customPermission);
        }
    }
    profile.customPermissions = customPermissionsToKeep;
    for (const customSettingAccess of profile.customSettingAccesses) {
        if (!customObjects[customSettingAccess.name]) {
            if (!result['customSettingAccesses'])
                result['customSettingAccesses'] = [];
            result['customSettingAccesses'].push({ field: 'name', element: customSettingAccess });
        } else {
            customSettingsToKeep.push(customSettingAccess);
        }
    }
    profile.customSettingAccesses = customSettingsToKeep;
    for (const fieldPermission of profile.fieldPermissions) {
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
            if (!inAux && !inObj) {
                if (!result['fieldPermissions'])
                    result['fieldPermissions'] = [];
                result['fieldPermissions'].push({ field: 'field', element: fieldPermission });
            } else {
                fieldToKeep.push(fieldPermission);
            }
        } else {
            if ((!customFields[sObject] || !customFields[sObject].childs[field])) {
                if (!result['fieldPermissions'])
                    result['fieldPermissions'] = [];
                result['fieldPermissions'].push({ field: 'field', element: fieldPermission });
            } else {
                fieldToKeep.push(fieldPermission);
            }
        }
    }
    profile.fieldPermissions = fieldToKeep;
    for (const flowAccess of profile.flowAccesses) {
        if (!flows[flowAccess.flow]) {
            if (!result['flowAccesses'])
                result['flowAccesses'] = [];
            result['flowAccesses'].push({ field: 'flow', element: flowAccess });
        } else {
            flowsToKeep.push(flowAccess);
        }
    }
    profile.flowAccesses = flowsToKeep;
    for (const layoutAssignment of profile.layoutAssignments) {
        let added = false;
        if (layoutAssignment.layout) {
            let sObject = layoutAssignment.layout.substring(0, layoutAssignment.layout.indexOf('-'));
            let layout = layoutAssignment.layout.substring(layoutAssignment.layout.indexOf('-') + 1);
            if (!layouts[sObject] || !layouts[sObject].childs[layout]) {
                if (!result['layoutAssignments'])
                    result['layoutAssignments'] = [];
                result['layoutAssignments'].push({ field: 'layout', element: layoutAssignment });
            } else {
                layoutsToKeep.push(layoutAssignment);
                added = true;
            }
        }
        if (layoutAssignment.recordType) {
            let sObject = layoutAssignment.recordType.substring(0, layoutAssignment.recordType.indexOf('.'));
            let rtName = layoutAssignment.recordType.substring(layoutAssignment.recordType.indexOf('.') + 1);
            if (!recordTypes[sObject] || !recordTypes[sObject].childs[rtName]) {
                if (!result['layoutAssignments'])
                    result['layoutAssignments'] = [];
                result['layoutAssignments'].push({ field: 'recordType', element: layoutAssignment });
            } else if (!added) {
                layoutsToKeep.push(layoutAssignment);
            }
        }
    }
    profile.layoutAssignments = layoutsToKeep;
    for (const objectPermission of profile.objectPermissions) {
        if (!customObjects[objectPermission.object]) {
            if (!result['objectPermissions'])
                result['objectPermissions'] = [];
            result['objectPermissions'].push({ field: 'object', element: objectPermission });
        } else {
            objectsToKeep.push(objectPermission);
        }
    }
    profile.objectPermissions = objectsToKeep;
    for (const pageAccess of profile.pageAccesses) {
        if (!apexPages[pageAccess.apexPage]) {
            if (!result['pageAccesses'])
                result['pageAccesses'] = [];
            result['pageAccesses'].push(pageAccess);
        } else {
            pagesToKeep.push(pageAccess);
        }
    }
    profile.pageAccesses = pagesToKeep;
    for (const recordTypeVisibility of profile.recordTypeVisibilities) {
        let sObject = recordTypeVisibility.recordType.substring(0, recordTypeVisibility.recordType.indexOf('.'));
        let recordType = recordTypeVisibility.recordType.substring(recordTypeVisibility.recordType.indexOf('.') + 1);
        if (!recordTypes[sObject] || !recordTypes[sObject].childs[recordType]) {
            if (!result['recordTypeVisibilities'])
                result['recordTypeVisibilities'] = [];
            result['recordTypeVisibilities'].push({ field: 'recordType', element: recordTypeVisibility });
        } else {
            recordTypesToKeep.push(recordTypeVisibility);
        }
    }
    profile.recordTypeVisibilities = recordTypesToKeep;
    for (const tabVisibility of profile.tabVisibilities) {
        if (tabVisibility.tab.indexOf('standard-') !== -1) {
            let sObj = StrUtils.replace(tabVisibility.tab, 'standard-', '');
            if (!customObjects[sObj]) {
                if (!result['tabVisibilities'])
                    result['tabVisibilities'] = [];
                result['tabVisibilities'].push({ field: 'tab', element: tabVisibility });
            } else {
                tabsToKeep.push(tabVisibility);
            }
        } else {
            if (!tabs[tabVisibility.tab]) {
                if (!result['tabVisibilities'])
                    result['tabVisibilities'] = [];
                result['tabVisibilities'].push({ field: 'tab', element: tabVisibility });
            } else {
                tabsToKeep.push(tabVisibility);
            }
        }
    }
    profile.tabVisibilities = tabsToKeep;
    if (Object.keys(result).length > 0 && !args.onlyCheck) {
        root.Profile = profile;
        if (args.compress) {
            content = MetadataCompressor.compressAsJSON(root);
            if (!content)
                content = XMLParser.toXML(root);
        } else {
            content = XMLParser.toXML(root);
        }
        FileWriter.createFileSync(objectToProcess.path, content);
    }
    return result;
}

function repairPermissionSet(args, typeToProcess, objectToProcess, allTypes) {
    if (args.progress) {
        Output.Printer.printProgress(Response.progress(undefined, 'Processing object ' + objectToProcess.name + ' from ' + typeToProcess.name, args.progress));
    }
    let result = {};
    let customApps = (allTypes[MetadataTypeNames.CUSTOM_APPLICATION] && allTypes[MetadataTypeNames.CUSTOM_APPLICATION].childs) ? allTypes[MetadataTypeNames.CUSTOM_APPLICATION].childs : {};
    let apexClasses = (allTypes[MetadataTypeNames.APEX_CLASS] && allTypes[MetadataTypeNames.APEX_CLASS].childs) ? allTypes[MetadataTypeNames.APEX_CLASS].childs : {};
    let customObjects = (allTypes[MetadataTypeNames.CUSTOM_OBJECT] && allTypes[MetadataTypeNames.CUSTOM_OBJECT].childs) ? allTypes[MetadataTypeNames.CUSTOM_OBJECT].childs : {};
    let customPermissions = (allTypes[MetadataTypeNames.CUSTOM_PERMISSION] && allTypes[MetadataTypeNames.CUSTOM_PERMISSION].childs) ? allTypes[MetadataTypeNames.CUSTOM_PERMISSION].childs : {};
    let customFields = (allTypes[MetadataTypeNames.CUSTOM_FIELDS] && allTypes[MetadataTypeNames.CUSTOM_FIELDS].childs) ? allTypes[MetadataTypeNames.CUSTOM_FIELDS].childs : {};
    let apexPages = (allTypes[MetadataTypeNames.APEX_PAGE] && allTypes[MetadataTypeNames.APEX_PAGE].childs) ? allTypes[MetadataTypeNames.APEX_PAGE].childs : {};
    let recordTypes = (allTypes[MetadataTypeNames.RECORD_TYPE] && allTypes[MetadataTypeNames.RECORD_TYPE].childs) ? allTypes[MetadataTypeNames.RECORD_TYPE].childs : {};
    let tabs = (allTypes[MetadataTypeNames.TAB] && allTypes[MetadataTypeNames.TAB].childs) ? allTypes[MetadataTypeNames.TAB].childs : {};
    let customMetadata = (allTypes[MetadataTypeNames.CUSTOM_METADATA] && allTypes[MetadataTypeNames.CUSTOM_METADATA].childs) ? allTypes[MetadataTypeNames.CUSTOM_METADATA].childs : {};
    let root = XMLParser.parseXML(FileReader.readFileSync(objectToProcess.path), true);
    let permissionSet = PermissionSetUtils.createPermissionSet(root.PermissionSet);
    let appsToKeep = [];
    let classesToKeep = [];
    let customPermissionsToKeep = [];
    let fieldToKeep = [];
    let objectsToKeep = [];
    let pagesToKeep = [];
    let recordTypesToKeep = [];
    let tabsToKeep = [];
    let customMetadataToKeep = [];
    let customSettingsToKeep = [];
    for (const appVisibility of permissionSet.applicationVisibilities) {
        if (!customApps[appVisibility.application]) {
            if (!result['applicationVisibilities'])
                result['applicationVisibilities'] = [];
            result['applicationVisibilities'].push({ field: 'application', element: appVisibility });
        } else {
            appsToKeep.push(appVisibility);
        }
    }
    permissionSet.applicationVisibilities = appsToKeep;
    for (const classAccess of permissionSet.classAccesses) {
        if (!apexClasses[classAccess.apexClass]) {
            if (!result['classAccesses'])
                result['classAccesses'] = [];
            result['classAccesses'].push({ field: 'apexClass', element: classAccess });
        } else {
            classesToKeep.push(classAccess);
        }
    }
    permissionSet.classAccesses = classesToKeep;
    for (const customMetadataAccess of permissionSet.customMetadataTypeAccesses) {
        if (!customMetadata[customMetadataAccess.name]) {
            if (!result['customMetadataTypeAccesses'])
                result['customMetadataTypeAccesses'] = [];
            result['customMetadataTypeAccesses'].push({ field: 'name', element: customMetadataAccess });
        } else {
            customMetadataToKeep.push(customMetadataAccess);
        }
    }
    permissionSet.customMetadataTypeAccesses = customMetadataToKeep;
    for (const customPermission of permissionSet.customPermissions) {
        if (!customPermissions[customPermission.name]) {
            if (!result['customPermissions'])
                result['customPermissions'] = [];
            result['customPermissions'].push({ field: 'name', element: customPermission });
        } else {
            customPermissionsToKeep.push(customPermission);
        }
    }
    permissionSet.customPermissions = customPermissionsToKeep;
    for (const customSettingAccess of permissionSet.customSettingAccesses) {
        if (!customObjects[customSettingAccess.name]) {
            if (!result['customSettingAccesses'])
                result['customSettingAccesses'] = [];
            result['customSettingAccesses'].push({ field: 'name', element: customSettingAccess });
        } else {
            customSettingsToKeep.push(customSettingAccess);
        }
    }
    permissionSet.customSettingAccesses = customSettingsToKeep;
    for (const fieldPermission of permissionSet.fieldPermissions) {
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
            if (!inAux && !inObj) {
                if (!result['fieldPermissions'])
                    result['fieldPermissions'] = [];
                result['fieldPermissions'].push({ field: 'field', element: fieldPermission });
            } else {
                fieldToKeep.push(fieldPermission);
            }
        } else {
            if ((!customFields[sObject] || !customFields[sObject].childs[field])) {
                if (!result['fieldPermissions'])
                    result['fieldPermissions'] = [];
                result['fieldPermissions'].push({ field: 'field', element: fieldPermission });
            } else {
                fieldToKeep.push(fieldPermission);
            }
        }
    }
    permissionSet.fieldPermissions = fieldToKeep;
    for (const objectPermission of permissionSet.objectPermissions) {
        if (!customObjects[objectPermission.object]) {
            if (!result['objectPermissions'])
                result['objectPermissions'] = [];
            result['objectPermissions'].push({ field: 'object', element: objectPermission });
        } else {
            objectsToKeep.push(objectPermission);
        }
    }
    permissionSet.objectPermissions = objectsToKeep;
    for (const pageAccess of permissionSet.pageAccesses) {
        if (!apexPages[pageAccess.apexPage]) {
            if (!result['pageAccesses'])
                result['pageAccesses'] = [];
            result['pageAccesses'].push(pageAccess);
        } else {
            pagesToKeep.push(pageAccess);
        }
    }
    permissionSet.pageAccesses = pagesToKeep;
    for (const recordTypeVisibility of permissionSet.recordTypeVisibilities) {
        let sObject = recordTypeVisibility.recordType.substring(0, recordTypeVisibility.recordType.indexOf('.'));
        let recordType = recordTypeVisibility.recordType.substring(recordTypeVisibility.recordType.indexOf('.') + 1);
        if (!recordTypes[sObject] || !recordTypes[sObject].childs[recordType]) {
            if (!result['recordTypeVisibilities'])
                result['recordTypeVisibilities'] = [];
            result['recordTypeVisibilities'].push({ field: 'recordType', element: recordTypeVisibility });
        } else {
            recordTypesToKeep.push(recordTypeVisibility);
        }
    }
    permissionSet.recordTypeVisibilities = recordTypesToKeep;
    for (const tabVisibility of permissionSet.tabSettings) {
        if (tabVisibility.tab.indexOf('standard-') !== -1) {
            let sObj = StrUtils.replace(tabVisibility.tab, 'standard-', '');
            if (!customObjects[sObj]) {
                if (!result['tabSettings'])
                    result['tabSettings'] = [];
                result['tabSettings'].push({ field: 'tab', element: tabVisibility });
            } else {
                tabsToKeep.push(tabVisibility);
            }
        } else {
            if (!tabs[tabVisibility.tab]) {
                if (!result['tabSettings'])
                    result['tabSettings'] = [];
                result['tabSettings'].push({ field: 'tab', element: tabVisibility });
            } else {
                tabsToKeep.push(tabVisibility);
            }
        }
    }
    permissionSet.tabSettings = tabsToKeep;
    if (Object.keys(result).length > 0 && !args.onlyCheck) {
        root.PermissionSet = permissionSet;
        if (args.compress) {
            content = MetadataCompressor.compressAsJSON(root);
            if (!content)
                content = XMLParser.toXML(root);
        } else {
            content = XMLParser.toXML(root);
        }
        FileWriter.createFileSync(objectToProcess.path, content);
    }
    return result;
}

//  TODO
function processErrors(args, results, allTypes) {
    if (args.progress) {
        Output.Printer.printProgress(Response.progress(undefined, 'Processing Errors', args.progress));
    }
    let errors = {};
    Object.keys(results).forEach(function (typeErrorKey) {
        if (allTypes[typeErrorKey]) {
            if (args.progress) {
                Output.Printer.printProgress(Response.progress(undefined, 'Processing Errors on type ' + typeErrorKey, args.progress));
            }
            let metadataType = allTypes[typeErrorKey];
            for (let typeErrors of results[typeErrorKey]) {
                if (metadataType.childs[typeErrors.object]) {
                    let metadataObject = metadataType.childs[typeErrors.object];
                    let fileContent = FileReader.readFileSync(metadataObject.path);
                    let lines = fileContent.split('\n');
                    Object.keys(typeErrors.deleted).forEach(function (collectionKey) {
                        let errorsAdded = [];
                        for (let deletedData of typeErrors.deleted[collectionKey]) {
                            let parentStartTag;
                            let parentEndTag;
                            let nameStartTag;
                            let nameEndTag;
                            let nLine = 1;
                            let errorData = deletedData.element;
                            for (const line of lines) {
                                if (!parentStartTag)
                                    parentStartTag = XMLParser.startTag(line, collectionKey);
                                if (parentStartTag) {
                                    let collectionFieldName = deletedData.field;
                                    if (collectionFieldName === '') {
                                        if (line.indexOf(errorData) !== -1) {
                                            let startColumn = line.indexOf(errorData);
                                            let endColumn = startColumn + errorData.length;
                                            let errorKey = collectionKey + collectionFieldName + typeErrors.object + line + startColumn + endColumn;
                                            if (!errorsAdded.includes(errorKey)) {
                                                if (!errors[typeErrorKey])
                                                    errors[typeErrorKey] = [];
                                                errors[typeErrorKey].push({
                                                    object: typeErrors.object,
                                                    line: nLine,
                                                    startColumn: startColumn,
                                                    endColumn: endColumn,
                                                    message: 'The element ' + errorData + ' in ' + collectionKey + ' on object ' + typeErrors.object + ' for type ' + typeErrorKey + ' not exists in local project',
                                                    severity: 'Warning',
                                                    file: metadataObject.path
                                                });
                                                errorsAdded.push(errorKey);
                                                break;
                                            }
                                        }
                                    } else {
                                        if (!nameStartTag)
                                            nameStartTag = XMLParser.startTag(line, collectionFieldName);
                                        if (nameStartTag) {
                                            if (line.indexOf(errorData[collectionFieldName]) != -1) {
                                                let startColumn = line.indexOf(errorData[collectionFieldName]);
                                                let endColumn = startColumn + errorData[collectionFieldName].length;
                                                let errorKey = collectionKey + collectionFieldName + typeErrors.object + line + startColumn + endColumn;
                                                if (!errorsAdded.includes(errorKey)) {
                                                    if (!errors[typeErrorKey])
                                                        errors[typeErrorKey] = [];
                                                    errors[typeErrorKey].push({
                                                        object: typeErrors.object,
                                                        line: nLine,
                                                        startColumn: startColumn,
                                                        endColumn: endColumn,
                                                        message: 'The element ' + errorData[collectionFieldName] + ' in ' + collectionKey + ' on object ' + typeErrors.object + ' for type ' + typeErrorKey + ' not exists in local project',
                                                        severity: 'Warning',
                                                        file: metadataObject.path
                                                    });
                                                    errorsAdded.push(errorKey);
                                                    break;
                                                }
                                            }
                                        }
                                        if (nameStartTag && !nameEndTag)
                                            nameEndTag = XMLParser.endTag(line, collectionFieldName);
                                        if (nameEndTag) {
                                            nameStartTag = undefined;
                                            nameEndTag = undefined;
                                        }
                                    }
                                }
                                if (parentStartTag && !parentEndTag)
                                    parentEndTag = XMLParser.endTag(line, collectionKey);
                                if (parentEndTag) {
                                    parentStartTag = undefined;
                                    parentEndTag = undefined;
                                    nameTag = undefined;
                                }
                                nLine++;
                            }
                        }
                    });
                }
            }
        }
    });
    return errors;
}