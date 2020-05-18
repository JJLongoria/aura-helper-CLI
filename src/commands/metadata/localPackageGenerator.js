const StrUtils = require('../../utils/strUtils');
const Utils = require('./utils');
const MetadataTypes = Metadata.MetadataTypes;

const DESTRUCT_BEFORE_FILENAME = 'destructiveChanges.xml';
const DESTRUCT_AFTER_FILENAME = 'destructiveChangesPost.xml';
const PACKAGE_FILENAME = 'package.xml';
const IGNORE_FILE_NAME = '.ahignore.json';
const deleteOrderAvailableValues = [
    "before",
    "after"
];

const TYPES_XML_RELATION = {
    AssignmentRules: {
        singularName: 'AssignmentRule',
        collection: 'assignmentRule',
        fieldKey: 'fullName',
    },
    AutoResponseRules: {
        singularName: 'AutoResponseRule',
        collection: 'autoresponseRule',
        fieldKey: 'fullName',
    },
    EscalationRules: {
        singularName: 'EscalationRule',
        collection: 'escalationRule',
        fieldKey: 'fullName',
    },
    MatchingRules: {
        singularName: 'MatchingRule',
        collection: 'matchingRules',
        fieldKey: 'fullName',
    },
    CustomLabels: {
        singularName: 'CustomLabel',
        collection: 'labels',
        fieldKey: 'fullName',
    },
    SharingCriteriaRule: {
        parentName: "SharingRules",
        collection: 'sharingCriteriaRules',
        fieldKey: 'fullName',
    },
    SharingOwnerRule: {
        parentName: "SharingRules",
        collection: 'sharingOwnerRules',
        fieldKey: 'fullName',
    },
    SharingGuestRule: {
        parentName: "SharingRules",
        collection: 'sharingGuestRules',
        fieldKey: 'fullName',
    },
    SharingTerritoryRule: {
        parentName: "SharingRules",
        collection: 'sharingTerritoryRules',
        fieldKey: 'fullName',
    },
    WorkflowAlert: {
        parentName: "Workflow",
        collection: 'alerts',
        fieldKey: 'fullName',
    },
    WorkflowKnowledgePublish: {
        parentName: "Workflow",
        collection: 'knowledgePublishes',
        fieldKey: 'fullName',
    },
    WorkflowFieldUpdate: {
        parentName: "Workflow",
        collection: 'fieldUpdates',
        fieldKey: 'fullName',
    },
    WorkflowRule: {
        parentName: "Workflow",
        collection: 'rules',
        fieldKey: 'fullName',
    },
    WorkflowTask: {
        parentName: "Workflow",
        collection: 'tasks',
        fieldKey: 'fullName',
    },
    WorkflowOutboundMessage: {
        parentName: "Workflow",
        collection: 'outboundMessages',
        fieldKey: 'fullName',
    }
};

const METADATA_WITH_CHILDS = {
    Workflow: [
        MetadataTypes.WORKFLOW_ALERT,
        MetadataTypes.WORKFLOW_KNOWLEDGE_PUBLISH,
        MetadataTypes.WORKFLOW_FIELD_UPDATE,
        MetadataTypes.WORKFLOW_RULE,
        MetadataTypes.WORKFLOW_TASK,
        MetadataTypes.WORKFLOW_OUTBOUND_MESSAGE
    ],
    SharingRules: [
        MetadataTypes.SHARING_CRITERIA_RULE,
        MetadataTypes.SHARING_OWNER_RULE,
        MetadataTypes.SHARING_GUEST_RULE,
        MetadataTypes.SHARING_TERRITORY_RULE
    ],
    CustomObject: [
        MetadataTypes.CUSTOM_FIELDS,
        MetadataTypes.INDEX,
        MetadataTypes.BUSINESS_PROCESS,
        MetadataTypes.COMPACT_LAYOUT,
        MetadataTypes.RECORD_TYPE,
        MetadataTypes.BUTTON_OR_LINK,
        MetadataTypes.VALIDATION_RULE,
        MetadataTypes.SHARING_REASON,
        MetadataTypes.LISTVIEW,
        MetadataTypes.FIELD_SET
    ]
};
        .option('-d, --delete-order <beforeOrAfter>', 'This option allow to the user for select the order for delete metadata. Available values are before or after (after by  default). If you select before, destructiveChanges will be deployed before the package, after option deploy destructive changes after the package file', 'after')
        .option('-s, --source <source>', 'Option for select a source for compare. If you select create-from git, available values are a branch name, tag name or commit reference (or use "this" for select the active branch). If you select create-from json, the value are the path to the file. If you select create-from package, the values are a comma-separated list of the package paths, the package.xml files will be merge on one package, and same with destructiveChanges.xml files')
        .option('-t, --target <target>', 'Option for select a target for compare. If you select create-from git, available values are a branch name, tag name or commit reference. This options is only available for create-from git')
        .option('-r, --raw', 'Option for return the data for crate the pacakge. With this options, the package and destructive files don\'t will be create, instead the output are the json file for create a package or use for another pourpose. This options only works for if you select --create-from git')
        .option('-v, --api-version <apiVersion>', 'Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the sfdx-project.json file')
        .option('-u, --use-ignore', 'Option for ignore the metadata included in ignore file from the package and destructive files')
        .option('-i, --ignore-file <path/to/ignore/file>', 'Path to the ignore file. Use this if you not want to use the project root ignore file or have different name. By default use ' + IGNORE_FILE_NAME + '  file from your project root', './' + IGNORE_FILE_NAME)
        .option('-e, --excplicit', 'If you select explicit option, the package will contains all object names explicit on the file, in otherwise, the package generator will be use a wildcard (*) when is necessary (All Childs from a metadata type are selected for deploy). Explicit option are fully recomended for retrieve metadata. This option only works if you select --create-from json', false)
        .option('-p, --progress [format]', 'Option for report the command progress. Available formats: ' + Utils.getProgressAvailableTypes().join(','))
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
    Output.Printer.setColorized(args.beautify);
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --create-type selected. Plase select one of this values: ' + createTypeAvailableValues.join(',')));
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --create-from selected. Plase select one of this values: ' + createFromAvailableValues.join(',')));
        return;
    }
    if (!deleteOrderAvailableValues.includes(args.deleteOrder)) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --delete-order selected. Plase select one of this values: ' + deleteOrderAvailableValues.join(',')));
    if (!args.ignoreFile)
        args.ignoreFile = args.root + '/' + IGNORE_FILE_NAME;
    else {
        try {
            args.ignoreFile = Paths.getAbsolutePath(args.ignoreFile);
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --ignore-file path. Select a valid path'));
            return;
        }
    }
    if (args.useIgnore && !FileChecker.isExists(args.ignoreFile)) {
        Output.Printer.printWarning('WARNING. --use-ignore option selected but not exists the ignore file in (' + args.ignoreFile + '). The selected files will be created but metadata not will be ignored');
    }
    if (args.apiVersion) {
        if (args.apiVersion.match(/^\d+\.\d+$/)) {
            let integerPart = args.apiVersion;
            if (args.apiVersion.indexOf('.') !== -1)
                integerPart = args.apiVersion.split('.')[0];
            args.apiVersion = integerPart + '.0';
        } else {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --api-version selected. Please, select a positive integer or decimal number'));
            return;
        }
    } else {
        let projectConfig = Config.getProjectConfig(args.root);
        args.apiVersion = projectConfig.sourceApiVersion;
    }
    if (args.progress) {
        if (!Utils.getProgressAvailableTypes().includes(args.progress)) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --progress value. Please, select any  of this vales: " + Utils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
            if (args.target === 'this') {
                Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --target. For --create-from git "this" value is only available for --source parameter'));
                return;
            }
            createFromGit(args).then(function (result) {
                if (args.raw) {
                    Output.Printer.printSuccess(Response.success('Mestadata extrated successfully for create the package and destructive files', result));
                } else {
                    Output.Printer.printSuccess(Response.success(result));
                }
            createFromCSV(args).then(function (result) {
            createFromJSON(args).then(function (result) {
            if (args.source.indexOf(',') !== -1) {
            } else if (args.source.indexOf(' ') !== -1) {
                packageSources = args.source.split(' ');
            createFromPackage(args, packages).then(function (result) {
    return args.root === undefined && args.path === undefined && args.createType === undefined && args.createFrom === undefined && args.source === undefined && args.target === undefined && args.apiVersion === undefined && args.deleteOrder === undefined && args.raw === undefined && args.explicit === undefined;
                args.source = args.target;
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Running Git Diff', args.progress));
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Processing Git Diff output', args.progress));
                //FileWriter.createFileSync('./diffsOut.txt', diffsOut.stdOut);
                //FileWriter.createFileSync('./gitDiffs.json', JSON.stringify(gitDiffs, null, 2));
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Getting All Available Metadata Types', args.progress));
                let metadataTypes = await MetadataConnection.getMetadataTypes(username, args.root, { forceDownload: true });
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Analyzing Process Diffs for get Metadata changes', args.progress));
                if (args.useIgnore) {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(undefined, 'Ignoring Metadata', args.progress));
                    ignoreMetadata(args, metadataFromGitDiffs.metadataForDeploy);
                    ignoreMetadata(args, metadataFromGitDiffs.metadataForDelete);
                }
                if (args.raw) {
                    resolve(metadataFromGitDiffs);
                } else if (args.createType === 'package') {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(undefined, 'Creating ' + PACKAGE_FILENAME, args.progress));
                    let packageContent = PackageGenerator.createPackage(metadataFromGitDiffs.metadataForDeploy, args.apiVersion, true);
                    let packagePath = args.outputPath + '/' + PACKAGE_FILENAME;
                    resolve(PACKAGE_FILENAME + ' file created succesfully on ' + args.outputPath);
                    let destructiveName;
                    if (args.deployOrder === 'before') {
                        destructiveName = DESTRUCT_BEFORE_FILENAME;
                    } else {
                        destructiveName = DESTRUCT_AFTER_FILENAME;
                    }
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(undefined, 'Creating ' + destructiveName, args.progress));
                    let destructiveContent = PackageGenerator.createPackage(metadataFromGitDiffs.metadataForDelete, args.apiVersion, true);
                    let destructivePath = args.outputPath + '/' + destructiveName;
                    resolve(destructiveName + ' file created succesfully on ' + args.outputPath);
                    let packagePath = args.outputPath + '/' + PACKAGE_FILENAME;
                    let destructiveName;
                    if (args.deployOrder === 'before') {
                        destructiveName = DESTRUCT_BEFORE_FILENAME;
                    } else {
                        destructiveName = DESTRUCT_AFTER_FILENAME;
                    }
                    let destructivePath = args.outputPath + '/' + destructiveName;
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(undefined, 'Creating ' + PACKAGE_FILENAME, args.progress));
                    let packageContent = PackageGenerator.createPackage(metadataFromGitDiffs.metadataForDeploy, args.apiVersion, true);
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(undefined, 'Creating ' + destructiveName, args.progress));
                    let destructiveContent = PackageGenerator.createPackage(metadataFromGitDiffs.metadataForDelete, args.apiVersion, true);
                    resolve(PACKAGE_FILENAME + ' and ' + destructiveName + ' files created succesfully on ' + args.outputPath);
    let aPathStart = '--- a/';
    let bPathStart = '+++ b/';
    let adevnull = '--- /dev/null';
    let bdevnull = '+++ /dev/null';
    let binaryFile = 'Binary files';
    let changesAdded = false;
    let removeChangesAdded = false;
    let extraDiff;
        let tmpLine = StrUtils.replace(diffLine, ',', '');
        if (tmpLine.indexOf('diff') !== -1 && tmpLine.indexOf('--git') !== -1) {
            if (diff && diff.path && diff.path.indexOf('force-app') !== -1) {
                if (extraDiff)
                    diff.mode = 'deleted file';
                if (!changesAdded) {
                    diff.addChanges = [];
                }
                if (!removeChangesAdded) {
                    diff.removeChanges = [];
                }
            }
            if (extraDiff) {
                if (!changesAdded) {
                    extraDiff.addChanges = [];
                }
                if (!removeChangesAdded) {
                    extraDiff.removeChanges = [];
                }
                diffs.push(extraDiff);
                extraDiff = undefined;
            }
                path: undefined,
            changesAdded = false;
            removeChangesAdded = false;
        } else if (tmpLine.startsWith(aPathStart)) {
            let pathTmp = tmpLine.substring(aPathStart.length).trim();
            if (pathTmp !== '/dev/null' && pathTmp.length > 0)
                diff.path = StrUtils.replace(pathTmp, ',', '');
        } else if (tmpLine.startsWith(adevnull)) {
            let pathTmp = tmpLine.substring(adevnull.length).trim();
            if (pathTmp !== '/dev/null' && pathTmp.length > 0)
                diff.path = StrUtils.replace(pathTmp, ',', '');
        } else if (tmpLine.startsWith(bPathStart)) {
            let pathTmp = tmpLine.substring(bPathStart.length).trim();
            startChanges = true;
            if (diff.path && diff.path !== pathTmp && pathTmp !== '/dev/null' && pathTmp.length > 0) {
                extraDiff = {
                    path: StrUtils.replace(pathTmp, ',', ''),
                    mode: 'new file',
                    removeChanges: [],
                    addChanges: []
                };
            } else if (!diff.path && pathTmp !== '/dev/null' && pathTmp.length > 0) {
                diff.path = StrUtils.replace(pathTmp, ',', '');
            } else if (pathTmp === '/dev/null' || pathTmp.length == 0) {
                diff.mode = 'deleted file';
            }
        } else if (tmpLine.startsWith(bdevnull)) {
            startChanges = true;
            let pathTmp = tmpLine.substring(bdevnull.length).trim();
            if (pathTmp !== '/dev/null' && pathTmp.length > 0)
                diff.path = StrUtils.replace(pathTmp, ',', '');
        } else if (tmpLine.startsWith(binaryFile)) {
            let pathTmp = tmpLine.substring(binaryFile.length).trim();
            let splits = pathTmp.split(' and ');
            if (splits.length > 1) {
                if (splits[0].indexOf('/dev/null') === -1) {
                    pathTmp = splits[0].substring('a/'.length);
                } else {
                    pathTmp = splits[1].substring('b/'.length);
                }
                if (pathTmp && !diff.path) {
                    diff.path = pathTmp;
                }
            }
        } else if (tmpLine.startsWith('new file mode')) {
        } else if (tmpLine.startsWith('deleted file mode')) {
            if (tmpLine.startsWith('-')) {
                if (extraDiff)
                    extraDiff.removeChanges.push(diffLine.substring(1));
                removeChangesAdded = true;
            } else if (tmpLine.startsWith('+')) {
                changesAdded = true;
                if (extraDiff)
                    extraDiff.addChanges.push(diffLine.substring(1));
            }
            else {
                diff.removeChanges.push(diffLine);
                diff.addChanges.push(diffLine);
                if (extraDiff) {
                    extraDiff.removeChanges.push(diffLine);
                    extraDiff.addChanges.push(diffLine);
                }
            }
    if (diff && diff.path && diff.path.indexOf('force-app') !== -1)
    return new Promise(function (resolve, reject) {

    return new Promise(function (resolve, reject) {
        try {
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Reading ' + args.source + ' JSON File', args.progress));
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Validating JSON Format', args.progress));
            if (args.useIgnore) {
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Ignoring Metadata', args.progress));
                ignoreMetadata(args, metadataTypes);
            }
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Creating ' + PACKAGE_FILENAME, args.progress));
                let packagePath = args.outputPath + '/' + PACKAGE_FILENAME;
                let packageContent = PackageGenerator.createPackage(metadataTypes, args.apiVersion, true);
                resolve(PACKAGE_FILENAME + ' file created succesfully on ' + args.outputPath);
                let destructiveName;
                if (args.deployOrder === 'before') {
                    destructiveName = DESTRUCT_BEFORE_FILENAME;
                } else {
                    destructiveName = DESTRUCT_AFTER_FILENAME;
                }
                let destructivePath = args.outputPath + '/' + destructiveName;
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Creating ' + destructiveName, args.progress));
                let destructiveContent = PackageGenerator.createPackage(metadataTypes, args.apiVersion, true);
                FileWriter.createFileSync(destructivePath, destructiveContent);
                resolve(destructiveName + ' file created succesfully on ' + args.outputPath);
        } catch (error) {
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Processing selected files', args.progress));
                if (file.endsWith(PACKAGE_FILENAME)) {
                } else if (file.endsWith(DESTRUCT_BEFORE_FILENAME) || file.endsWith(DESTRUCT_AFTER_FILENAME)) {
                let packagePath = args.outputPath + '/' + PACKAGE_FILENAME;
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Mergin Package Files', args.progress));
                let metadataToDeploy = PackageGenerator.mergePackages(pkgs, args.apiVersion);
                if (args.useIgnore) {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(undefined, 'Ignoring Metadata', args.progress));
                    ignoreMetadata(args, metadataToDeploy);
                }
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Creating ' + PACKAGE_FILENAME, args.progress));
                let packageContent = PackageGenerator.createPackage(metadataToDeploy, args.apiVersion, true);
                resolve(PACKAGE_FILENAME + ' file created succesfully on ' + args.outputPath);
                let destructiveName;
                if (args.deployOrder === 'before') {
                    destructiveName = DESTRUCT_BEFORE_FILENAME;
                } else {
                    destructiveName = DESTRUCT_AFTER_FILENAME;
                }
                let destructivePath = args.outputPath + '/' + destructiveName;
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Mergin Destructive Files', args.progress));
                let metadataToDelete = PackageGenerator.mergePackages(destrucPkgs, args.apiVersion);
                if (args.useIgnore) {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(undefined, 'Ignoring Metadata', args.progress));
                    ignoreMetadata(args, metadataToDelete);
                }
                let destructiveContent = PackageGenerator.createPackage(metadataToDelete, args.apiVersion, true);
                FileWriter.createFileSync(destructivePath, destructiveContent);
                resolve(destructiveName + ' file created succesfully on ' + args.outputPath);
                let packagePath = args.outputPath + '/' + PACKAGE_FILENAME;
                let destructiveName;
                if (args.deployOrder === 'before') {
                    destructiveName = DESTRUCT_BEFORE_FILENAME;
                } else {
                    destructiveName = DESTRUCT_AFTER_FILENAME;
                }
                let destructivePath = args.outputPath + '/' + destructiveName;
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Mergin Package Files', args.progress));
                let metadataToDeploy = PackageGenerator.mergePackages(pkgs, args.apiVersion);
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Mergin Destructive Files', args.progress));
                let metadataToDelete = PackageGenerator.mergePackages(destrucPkgs, args.apiVersion);
                if (args.useIgnore) {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(undefined, 'Ignoring Metadata', args.progress));
                    ignoreMetadata(args, metadataToDeploy);
                    ignoreMetadata(args, metadataToDelete);
                }
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Creating ' + PACKAGE_FILENAME, args.progress));
                let packageContent = PackageGenerator.createPackage(metadataToDeploy, args.apiVersion, true);
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Creating ' + destructiveName, args.progress));
                let destructiveContent = PackageGenerator.createPackage(metadataToDelete, args.apiVersion, true);
                resolve(PACKAGE_FILENAME + ' and ' + destructiveName + ' files created succesfully on ' + args.outputPath);
}

function ignoreMetadata(args, metadata) {
    if (FileChecker.isExists(args.ignoreFile)) {
        let ignoredMetadata = JSON.parse(FileReader.readFileSync(args.ignoreFile));
        Object.keys(ignoredMetadata).forEach(function (metadataTypeKey) {
            let typeData = TYPES_XML_RELATION[metadataTypeKey];
            if ((metadata[metadataTypeKey] || (typeData && typeData.singularName))) {
                switch (metadataTypeKey) {
                    case MetadataTypes.CUSTOM_LABELS:
                        ignoreCustomLabels(metadata[metadataTypeKey], ignoredMetadata[metadataTypeKey], metadata[typeData.singularName]);
                        break;
                    case MetadataTypes.MATCHING_RULES:
                    case MetadataTypes.ASSIGNMENT_RULES:
                    case MetadataTypes.AUTORESPONSE_RULES:
                    case MetadataTypes.ESCALATION_RULES:
                        if (metadata[typeData.singularName])
                            ignoreRules(metadata[metadataTypeKey], ignoredMetadata[metadataTypeKey], metadata[typeData.singularName]);
                        break;
                    case MetadataTypes.SHARING_CRITERIA_RULE:
                    case MetadataTypes.SHARING_OWNER_RULE:
                    case MetadataTypes.SHARING_GUEST_RULE:
                    case MetadataTypes.SHARING_TERRITORY_RULE:
                    case MetadataTypes.WORKFLOW_ALERT:
                    case MetadataTypes.WORKFLOW_KNOWLEDGE_PUBLISH:
                    case MetadataTypes.WORKFLOW_FIELD_UPDATE:
                    case MetadataTypes.WORKFLOW_RULE:
                    case MetadataTypes.WORKFLOW_TASK:
                    case MetadataTypes.WORKFLOW_OUTBOUND_MESSAGE:
                    case MetadataTypes.WORKFLOW:
                    case MetadataTypes.SHARING_RULES:
                        ignoreMetadataWithChilds(metadata[metadataTypeKey], ignoredMetadata[metadataTypeKey], metadata);
                        break;
                    case MetadataTypes.CUSTOM_OBJECT:
                    case MetadataTypes.CUSTOM_FIELDS:
                    case MetadataTypes.INDEX:
                    case MetadataTypes.BUSINESS_PROCESS:
                    case MetadataTypes.COMPACT_LAYOUT:
                    case MetadataTypes.RECORD_TYPE:
                    case MetadataTypes.BUTTON_OR_LINK:
                    case MetadataTypes.VALIDATION_RULE:
                    case MetadataTypes.SHARING_REASON:
                    case MetadataTypes.LISTVIEW:
                    case MetadataTypes.FIELD_SET:
                        ignoreFromCustomObjects(metadata[metadataTypeKey], ignoredMetadata[metadataTypeKey], metadata);
                        break;
                    default:
                        ignoreOtherMetadataTypes(metadata[metadataTypeKey], ignoredMetadata[metadataTypeKey]);
                        break;
                }
            }
        });
    }
}

function ignoreCustomLabels(metadataType, ignoredMetadata, singularType) {
    let ignoredFromTypeMap = MetadataFactory.createIgnoreMap(ignoredMetadata);
    if (ignoredMetadata.includes('*')) {
        if (metadataType) {
            Object.keys(metadataType.childs).forEach(function (objectKey) {
                metadataType.childs[objectKey].checked = false;
            });
        }
    }
    if (singularType) {
        let dataToRemove = [];
        let dataToKeep = [];
        Object.keys(singularType.childs).forEach(function (objectKey) {
            if (ignoredMetadata.includes('*') || (ignoredFromTypeMap[objectKey] && ignoredFromTypeMap[objectKey].includes(objectKey))) {
                singularType.childs[objectKey].checked = false;
                dataToRemove.push(objectKey);
            } else {
                dataToKeep.push(objectKey);
            }
        });
        if (dataToRemove.length > 0) {
            if (metadataType) {
                Object.keys(metadataType.childs).forEach(function (objectKey) {
                    metadataType.childs[objectKey].checked = false;
                });
            }
        }
    }
}

function ignoreRules(metadataType, ignoredMetadata, singularType) {
    let ignoredFromTypeMap = MetadataFactory.createIgnoreMap(ignoredMetadata);
    if (ignoredMetadata.includes('*')) {
        if (metadataType) {
            Object.keys(metadataType.childs).forEach(function (objectKey) {
                metadataType.childs[objectKey].checked = false;
            });
        }
    }
    if (singularType) {
        let dataToRemove = [];
        let dataToKeep = [];
        Object.keys(singularType.childs).forEach(function (objectKey) {
            if (singularType.childs[objectKey].childs && Object.keys(singularType.childs[objectKey].childs).length > 0) {
                Object.keys(singularType.childs[objectKey].childs).forEach(function (itemKey) {
                    if (ignoredMetadata.includes('*') || (ignoredFromTypeMap[objectKey] && ignoredFromTypeMap[objectKey].includes(itemKey) || ignoredFromTypeMap[objectKey].includes('*'))) {
                        singularType.childs[objectKey].checked = false;
                        singularType.childs[objectKey].childs[itemKey].checked = false;
                        dataToRemove.push(objectKey + ':' + itemKey);
                    } else {
                        dataToKeep.push(objectKey);
                    }
                });
            } else if (ignoredMetadata.includes('*') || (ignoredFromTypeMap[objectKey] && ignoredFromTypeMap[objectKey].includes('*'))) {
                singularType.childs[objectKey].checked = false;
                dataToRemove.push(objectKey + ':*');
            }
        });
        if (dataToRemove.length > 0) {
            if (metadataType) {
                Object.keys(metadataType.childs).forEach(function (objectKey) {
                    metadataType.childs[objectKey].checked = false;
                });
            }
        }
    }
}

function ignoreMetadataWithChilds(metadataType, ignoredMetadata, allTypes) {
    if (METADATA_WITH_CHILDS[metadataType.name]) {
        if (ignoredMetadata.includes('*')) {
            Object.keys(metadataType.childs).forEach(function (objectKey) {
                metadataType.childs[objectKey].checked = false;
            });
            for (let childType of METADATA_WITH_CHILDS[metadataType.name]) {
                if (allTypes[childType]) {
                    Object.keys(allTypes[childType].childs).forEach(function (objectKey) {
                        if (allTypes[childType] && allTypes[childType].childs[objectKey]) {
                            allTypes[childType].childs[objectKey].checked = false;
                            Object.keys(allTypes[childType].childs[objectKey].childs).forEach(function (itemKey) {
                                allTypes[childType].childs[objectKey].childs[itemKey].checked = false;
                            });
                        }
                    });
                }
            }
        } else {
            let ignoredFromTypeMap = MetadataFactory.createIgnoreMap(ignoredMetadata);
            Object.keys(metadataType.childs).forEach(function (objectKey) {
                if (ignoredFromTypeMap[objectKey] && (ignoredFromTypeMap[objectKey].includes(objectKey) || ignoredFromTypeMap[objectKey].includes('*'))) {
                    metadataType.childs[objectKey].checked = false;
                    for (let childType of METADATA_WITH_CHILDS[metadataType.name]) {
                        if (allTypes[childType] && allTypes[childType].childs[objectKey]) {
                            Object.keys(allTypes[childType].childs[objectKey].childs).forEach(function (itemKey) {
                                allTypes[childType].childs[objectKey].childs[itemKey].checked = false;
                            });
                        }
                    }
                }
            });
        }
    } else {
        if (ignoredMetadata.includes('*')) {
            Object.keys(metadataType.childs).forEach(function (objectKey) {
                metadataType.childs[objectKey].checked = false;
                Object.keys(metadataType.childs[objectKey].childs).forEach(function (itemKey) {
                    metadataType.childs[objectKey].childs[itemKey].checked = false;
                });
            });
        } else {
            let ignoredFromTypeMap = MetadataFactory.createIgnoreMap(ignoredMetadata);
            Object.keys(metadataType.childs).forEach(function (objectKey) {
                let removeData = [];
                Object.keys(metadataType.childs[objectKey].childs).forEach(function (itemKey) {
                    if (ignoredFromTypeMap[objectKey] && (ignoredFromTypeMap[objectKey].includes(itemKey) || ignoredFromTypeMap[objectKey].includes('*'))) {
                        metadataType.childs[objectKey].childs[itemKey].checked = false;
                        removeData.push(objectKey + ':' + itemKey);
                    }
                });
            });
        }

    }
}

function ignoreFromCustomObjects(metadataType, ignoredMetadata, allTypes) {
    if (METADATA_WITH_CHILDS[metadataType.name]) {
        if (ignoredMetadata.includes('*:*')) {
            Object.keys(metadataType.childs).forEach(function (objectKey) {
                metadataType.childs[objectKey].checked = false;
            });
            for (let childType of METADATA_WITH_CHILDS[metadataType.name]) {
                if (allTypes[childType]) {
                    Object.keys(allTypes[childType].childs).forEach(function (objectKey) {
                        allTypes[childType].childs[objectKey].checked = false;
                        Object.keys(allTypes[childType].childs[objectKey].childs).forEach(function (itemKey) {
                            allTypes[childType].childs[objectKey].childs[itemKey].checked = false;
                        });
                    });
                }
            }
        } else if (ignoredMetadata.includes('*')) {
            Object.keys(metadataType.childs).forEach(function (objectKey) {
                metadataType.childs[objectKey].checked = false;
            });
        } else {
            let ignoredFromTypeMap = MetadataFactory.createIgnoreMap(ignoredMetadata);
            Object.keys(metadataType.childs).forEach(function (objectKey) {
                if (ignoredFromTypeMap[objectKey] && (ignoredFromTypeMap[objectKey].includes(objectKey) || ignoredFromTypeMap[objectKey].includes('*'))) {
                    metadataType.childs[objectKey].checked = false;
                    if (ignoredFromTypeMap[objectKey].includes('*')) {
                        for (let childType of METADATA_WITH_CHILDS[metadataType.name]) {
                            if (allTypes[childType] && allTypes[childType].childs[objectKey]) {
                                Object.keys(allTypes[childType].childs[objectKey].childs).forEach(function (itemKey) {
                                    allTypes[childType].childs[objectKey].childs[itemKey].checked = false;
                                });
                            }
                        }
                    }
                }
            });
        }
    } else {
        if (ignoredMetadata.includes('*')) {
            Object.keys(metadataType.childs).forEach(function (objectKey) {
                metadataType.childs[objectKey].checked = false;
                Object.keys(metadataType.childs[objectKey].childs).forEach(function (itemKey) {
                    metadataType.childs[objectKey].childs[itemKey].checked = false;
                });
            });
        } else {
            let ignoredFromTypeMap = MetadataFactory.createIgnoreMap(ignoredMetadata);
            Object.keys(metadataType.childs).forEach(function (objectKey) {
                Object.keys(metadataType.childs[objectKey].childs).forEach(function (itemKey) {
                    if (ignoredFromTypeMap[objectKey] && (ignoredFromTypeMap[objectKey].includes(itemKey) || ignoredFromTypeMap[objectKey].includes('*'))) {
                        metadataType.childs[objectKey].childs[itemKey].checked = false;
                    }
                });

            });
        }
    }
}

function ignoreOtherMetadataTypes(metadataType, ignoredMetadata) {
    if (ignoredMetadata.includes('*')) {
        Object.keys(metadataType.childs).forEach(function (objectKey) {
            metadataType.childs[objectKey].checked = false;
            Object.keys(metadataType.childs[objectKey].childs).forEach(function (itemKey) {
                metadataType.childs[objectKey].childs[itemKey].checked = false;
            });
        });
    } else {
        let ignoredFromTypeMap = MetadataFactory.createIgnoreMap(ignoredMetadata);
        Object.keys(metadataType.childs).forEach(function (objectKey) {
            if (ignoredFromTypeMap[objectKey]) {
                if (ignoredFromTypeMap[objectKey] && (ignoredFromTypeMap[objectKey].includes('*') || ignoredFromTypeMap[objectKey].includes(objectKey))) {
                    metadataType.childs[objectKey].checked = false;
                }
                Object.keys(metadataType.childs[objectKey].childs).forEach(function (itemKey) {
                    if (ignoredFromTypeMap[objectKey] && (ignoredFromTypeMap[objectKey].includes(itemKey) || ignoredFromTypeMap[objectKey].includes('*'))) {
                        metadataType.childs[objectKey].childs[itemKey].checked = false;
                    }
                });
            }
        });
    }