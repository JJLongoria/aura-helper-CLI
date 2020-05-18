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
const MetadataConnection = Metadata.Connection;
const MetadataTypes = Metadata.MetadataTypes;
const MetadataUtils = Metadata.Utils;
const XMLParser = Languages.XMLParser;
const MetadataCompressor = Metadata.MetadataCompressor;

const IGNORE_FILE_NAME = '.ahignore.json';

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

exports.createCommand = function (program) {
    program
        .command('metadata:local:ignore')
        .description('Command for ignore metadata from your project. Use .ahignore.json file for perform this operation. This command will be delete the ignored metadata from your project folder')
        .option('-r, --root <path/to/project/root>', 'Path to project root', './')
        .option('-a, --all', 'Ignore all metadata types according to the ignore file')
        .option('-t, --type <MetadataTypeNames>', 'Ignore the specified metadata types according to the ignore file. You can select a sigle or a list separated by commas. This options does not take effect if you choose ignore all')
        .option('-i, --ignore-file <path/to/ignore/file>', 'Path to the ignore file. Use this if you not want to use the project root ignore file or have different name. By default use ' + IGNORE_FILE_NAME + '  file from your project root', './' + IGNORE_FILE_NAME)
        .option('-c, --compress', 'Add this option for compress modifieds files for ignore operation.')
        .option('-p, --progress [format]', 'Option for report the command progress. Available formats: ' + Utils.getProgressAvailableTypes().join(','))
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
    if (args.all == undefined && args.type === undefined) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "You must select ignore all or ignore specific types"));
        return;
    }
    try {
        args.root = Paths.getAbsolutePath(args.root);
    } catch (error) {
        Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --root path. Select a valid path'));
        return;
    }
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
    if (!FileChecker.isSFDXRootPath(args.root)) {
        Output.Printer.printError(Response.error(ErrorCodes.PROJECT_NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND + Paths.getAbsolutePath(pathToRoot)));
        return;
    }
    if (!FileChecker.isExists(args.ignoreFile)) {
        Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, args.ignoreFile + " file not found. Check if file exists or have access permission"));
        return;
    }
    if (args.all == undefined && args.type === undefined) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "You must select ignore all or repair specific types"));
        return;
    }
    if (args.progress) {
        if (!Utils.getProgressAvailableTypes().includes(args.progress)) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --progress value. Please, select any  of this vales: " + Utils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
    let types;
    if (args.type) {
        types = Utils.getTypes(args.type);
    }
    ignoreMetadata(args, types).then(function (typesProcessed) {
        Output.Printer.printSuccess(Response.success("Ignore metadata finished successfully", typesProcessed));
    }).catch(function (error) {
        Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
    });
}

function hasEmptyArgs(args) {
    return args.all === undefined && args.type === undefined && args.root === undefined && args.ignoreFile === undefined && args.compress === undefined;
}


function ignoreMetadata(args, typesForIgnore) {
    return new Promise(async function (resolve, reject) {
        try {
            let typesProcessed = {};
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Reading ignore File', args.progress));
            let ignoredMetadata = JSON.parse(FileReader.readFileSync(args.ignoreFile));
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Gettin All Available Metadata Types', args.progress));
            let username = await Config.getAuthUsername(args.root);
            let metadataTypes = await MetadataConnection.getMetadataTypes(username, args.root, { forceDownload: false });
            let folderMetadataMap = MetadataFactory.createFolderMetadataMap(metadataTypes);
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Describing Local Metadata Types', args.progress));
            let metadataFromFileSystem = MetadataFactory.getMetadataObjectsFromFileSystem(folderMetadataMap, args.root);
            Object.keys(ignoredMetadata).forEach(function (metadataTypeKey) {
                let typeData = TYPES_XML_RELATION[metadataTypeKey];
                if ((metadataFromFileSystem[metadataTypeKey] || (typeData && typeData.singularName)) && (!typesForIgnore || typesForIgnore.includes(metadataTypeKey))) {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(undefined, 'Processing ' + metadataTypeKey + ' Metadata Type', args.progress));
                    switch (metadataTypeKey) {
                        case MetadataTypes.CUSTOM_LABELS:
                            ignoreCustomLabels(args, metadataFromFileSystem[metadataTypeKey], ignoredMetadata[metadataTypeKey], typeData);
                            break;
                        case MetadataTypes.MATCHING_RULES:
                        case MetadataTypes.ASSIGNMENT_RULES:
                        case MetadataTypes.AUTORESPONSE_RULES:
                        case MetadataTypes.ESCALATION_RULES:
                            if (metadataFromFileSystem[typeData.singularName])
                                ignoreRules(args, metadataFromFileSystem[metadataTypeKey], ignoredMetadata[metadataTypeKey], metadataFromFileSystem[typeData.singularName]);
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
                            ignoreMetadataFromFiles(args, metadataFromFileSystem[metadataTypeKey], ignoredMetadata[metadataTypeKey]);
                            break;
                        case MetadataTypes.CUSTOM_OBJECT:
                            ignoreCustomObjects(args, metadataFromFileSystem[metadataTypeKey], ignoredMetadata[metadataTypeKey]);
                            break;
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
                            ignoreFromCustomObjects(args, metadataFromFileSystem[metadataTypeKey], ignoredMetadata[metadataTypeKey]);
                            break;
                        case MetadataTypes.EMAIL_TEMPLATE:
                        case MetadataTypes.REPORTS:
                        case MetadataTypes.DASHBOARD:
                        case MetadataTypes.DOCUMENT:
                            ignoreMetadataFromFolders(args, metadataFromFileSystem[metadataTypeKey], ignoredMetadata[metadataTypeKey]);
                            break;
                        case MetadataTypes.PROFILE:
                        case MetadataTypes.PERMISSION_SET:
                            ignoreFromPermissionFiles(args, metadataFromFileSystem[metadataTypeKey], ignoredMetadata[metadataTypeKey]);
                            break;
                        default:
                            ignoreMetadataFiles(args, metadataFromFileSystem[metadataTypeKey], ignoredMetadata[metadataTypeKey]);
                            break;
                    }
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}
/*
function ignoreCustomLabels(args, ignoredLabels, metadataFromFileSystem) {
    if (ignoredLabels.includes('*')) {
        let labels = metadataFromFileSystem[MetadataTypeNames.CUSTOM_LABEL].childs;
        let path = metadataFromFileSystem[MetadataTypeNames.CUSTOM_LABELS].path;
        FileWriter.delete(path);
        return { total: Object.keys(labels).length, ignored: Object.keys(labels) };
    }
    else {
        let removedLabels = [];
        let path = metadataFromFileSystem[MetadataTypeNames.CUSTOM_LABELS].path + '/CustomLabels.labels-meta.xml';
        let xmlRoot = XMLParser.parseXML(FileReader.readFileSync(path), false);
        xmlRoot = XMLParser.fixObjValues(xmlRoot);
        let labels = [];
        for (const label of xmlRoot.CustomLabels.labels) {
            if (ignoredLabels.includes(label.fullName)) {
                removedLabels.push(label.fullName);
            } else {
                labels.push(label);
            }
        }
        xmlRoot.CustomLabels.labels = labels;
        let content;
        if (args.compress) {
            content = MetadataCompressor.compressAsJSON(xmlRoot);
            if (!content)
                content = XMLParser.toXML(xmlRoot);
        } else {
            content = XMLParser.toXML(xmlRoot);
        }
        FileWriter.createFileSync(path, content);
        return { total: removedLabels.length, ignored: removedLabels };
    }
}*/

function ignoreFromPermissionFiles(args, metadataType, ignoredMetadata) {
    if (ignoredMetadata.includes('*')) {
        if (FileChecker.isExists(metadataType.path))
            FileWriter.delete(metadataType.path);
    } else {
        let ignoredFromTypeMap = MetadataFactory.createIgnoreMap(ignoredMetadata);
        let permissionsToIgnore = {};
        Object.keys(ignoredFromTypeMap).forEach(function (ignoredObjectKey) {
            let ignoredTypes = ignoredFromTypeMap[ignoredObjectKey];
            for (let ignoredType of ignoredTypes) {
                if (ignoredType.permission) {
                    if (!permissionsToIgnore[ignoredObjectKey])
                        permissionsToIgnore[ignoredObjectKey] = [];
                    if (!permissionsToIgnore[ignoredObjectKey].includes(ignoredType.permission))
                        permissionsToIgnore[ignoredObjectKey].push(ignoredType.permission);
                }
            }
        });
        Object.keys(metadataType.childs).forEach(function (objectKey) {
            if (ignoredFromTypeMap[objectKey]) {
                if (ignoredFromTypeMap[objectKey].includes(objectKey)) {
                    if (FileChecker.isExists(metadataType.childs[objectKey].path))
                        FileWriter.delete(metadataType.childs[objectKey].path);
                }
            }
        });
        Object.keys(permissionsToIgnore).forEach(function (objectKey) {
            if (metadataType.childs[objectKey] || objectKey === '*') {
                let xmlRoot = XMLParser.parseXML(FileReader.readFileSync(metadataType.childs[objectKey].path), false);
                if (xmlRoot[metadataType.name] && xmlRoot[metadataType.name].userPermissions) {
                    xmlRoot[metadataType.name].userPermissions = MetadataUtils.forceArray(xmlRoot[metadataType.name].userPermissions);
                    let dataToRemove = [];
                    let dataToKeep = [];
                    for (let permission of xmlRoot[metadataType.name].userPermissions) {
                        if (permissionsToIgnore[objectKey].includes(permission.name) || permissionsToIgnore[objectKey].includes('*')) {
                            dataToRemove.push(permission);
                        } else {
                            dataToKeep.push(permission);
                        }
                    }
                    xmlRoot[metadataType.name].userPermissions = dataToKeep;
                    if (dataToRemove.length > 0) {
                        let content;
                        if (args.compress) {
                            content = MetadataCompressor.compressAsJSON(xmlRoot);
                            if (!content)
                                content = XMLParser.toXML(xmlRoot);
                        } else {
                            content = XMLParser.toXML(xmlRoot);
                        }
                        FileWriter.createFileSync(metadataType.childs[objectKey].path, content);
                    }
                }
            }
        });
    }
}

function ignoreCustomObjects(args, metadataType, ignoredMetadata) {
    if (ignoredMetadata.includes('*:*')) {
        if (FileChecker.isExists(metadataType.path))
            FileWriter.delete(metadataType.path);
    } else {
        let ignoredFromTypeMap = MetadataFactory.createIgnoreMap(ignoredMetadata);
        Object.keys(metadataType.childs).forEach(function (objectKey) {
            if (ignoredFromTypeMap[objectKey]) {
                if (ignoredFromTypeMap[objectKey].includes(objectKey) || ignoredMetadata.includes('*')) {
                    if (FileChecker.isExists(metadataType.childs[objectKey].path))
                        FileWriter.delete(metadataType.childs[objectKey].path);
                    let metaFile = metadataType.childs[objectKey].path + '-meta.xml';
                    if (FileChecker.isExists(metaFile))
                        FileWriter.delete(metaFile);
                } else if (ignoredFromTypeMap[objectKey].includes('*')) {
                    let folder = Paths.getFolderPath(metadataType.childs[objectKey].path);
                    if (FileChecker.isExists(folder))
                        FileWriter.delete(folder);

                }
            }
        });
    }
}

function ignoreFromCustomObjects(args, metadataType, ignoredMetadata) {
    let ignoredFromTypeMap = MetadataFactory.createIgnoreMap(ignoredMetadata);
    Object.keys(metadataType.childs).forEach(function (objectKey) {
        if (ignoredMetadata.includes('*') || (ignoredFromTypeMap[objectKey] && ignoredFromTypeMap[objectKey].includes('*'))) {
            if (FileChecker.isExists(metadataType.childs[objectKey].path))
                FileWriter.delete(metadataType.childs[objectKey].path);
        } else if (ignoredFromTypeMap[objectKey]) {
            Object.keys(metadataType.childs[objectKey].childs).forEach(function (itemKey) {
                if (ignoredFromTypeMap[objectKey].includes(itemKey)) {
                    if (FileChecker.isExists(metadataType.childs[objectKey].childs[itemKey].path))
                        FileWriter.delete(metadataType.childs[objectKey].childs[itemKey].path);
                }
            });
        }
    });
}

function ignoreMetadataFiles(args, metadataType, ignoredMetadata) {
    if (ignoredMetadata.includes('*')) {
        if (FileChecker.isExists(metadataType.path))
            FileWriter.delete(metadataType.path);
    } else {
        let ignoredFromTypeMap = MetadataFactory.createIgnoreMap(ignoredMetadata);
        Object.keys(metadataType.childs).forEach(function (objectKey) {
            if (ignoredFromTypeMap[objectKey]) {
                if (metadataType.childs[objectKey].childs && Object.keys(metadataType.childs[objectKey].childs).length > 0) {
                    Object.keys(metadataType.childs[objectKey].childs).forEach(function (itemKey) {
                        if (ignoredFromTypeMap[objectKey].includes(itemKey) || ignoredFromTypeMap[objectKey].includes('*')) {
                            if (FileChecker.isExists(metadataType.childs[objectKey].childs[itemKey].path))
                                FileWriter.delete(metadataType.childs[objectKey].childs[itemKey].path);
                            let metaFile = metadataType.childs[objectKey].childs[itemKey].path + '-meta.xml';
                            if (FileChecker.isExists(metaFile))
                                FileWriter.delete(metaFile);
                        }
                    });
                } else {
                    if (ignoredFromTypeMap[objectKey].includes(objectKey) || ignoredFromTypeMap[objectKey].includes('*')) {
                        if (FileChecker.isExists(metadataType.childs[objectKey].path))
                            FileWriter.delete(metadataType.childs[objectKey].path);
                        let metaFile = metadataType.childs[objectKey].path + '-meta.xml';
                        if (FileChecker.isExists(metaFile))
                            FileWriter.delete(metaFile);
                    }
                }
            }
        });
    }
}

function ignoreMetadataFromFolders(args, metadataType, ignoredMetadata) {
    if (ignoredMetadata.includes('*')) {
        if (FileChecker.isExists(metadataType.path))
            FileWriter.delete(metadataType.path);
    } else {
        let ignoredFromTypeMap = MetadataFactory.createIgnoreMap(ignoredMetadata);
        Object.keys(metadataType.childs).forEach(function (objectKey) {
            if (ignoredFromTypeMap[objectKey]) {
                if (ignoredFromTypeMap[objectKey].includes('*')) {
                    if (FileChecker.isExists(metadataType.childs[objectKey].path))
                        FileWriter.delete(metadataType.childs[objectKey].path);
                    let metaFile = metadataType.childs[objectKey].path + '.' + metadataType.suffix + 'Folder-meta.xml';
                    if (FileChecker.isExists(metaFile))
                        FileWriter.delete(metaFile);
                } else {
                    Object.keys(metadataType.childs[objectKey].childs).forEach(function (itemKey) {
                        if (ignoredFromTypeMap[objectKey].includes(itemKey)) {
                            if (FileChecker.isExists(metadataType.childs[objectKey].childs[itemKey].path))
                                FileWriter.delete(metadataType.childs[objectKey].childs[itemKey].path);
                            let metaFile = metadataType.childs[objectKey].childs[itemKey].path + '-meta.xml';
                            if (FileChecker.isExists(metaFile))
                                FileWriter.delete(metaFile);
                        }
                    });
                }
            }
        });
    }
}

function ignoreMetadataFromFiles(args, metadataType, ignoredMetadata) {
    let typeData = TYPES_XML_RELATION[metadataType.name];
    let ignoredFromTypeMap = MetadataFactory.createIgnoreMap(ignoredMetadata);
    Object.keys(metadataType.childs).forEach(function (objectKey) {
        if (ignoredFromTypeMap[objectKey] || ignoredMetadata.includes('*')) {
            let path = metadataType.path + '/' + objectKey + '.' + metadataType.suffix + '-meta.xml';
            if (FileChecker.isExists(path)) {
                let xmlRoot = XMLParser.parseXML(FileReader.readFileSync(path), false);
                if (xmlRoot[typeData.parentName] && xmlRoot[typeData.parentName][typeData.collection]) {
                    if ((ignoredFromTypeMap[objectKey] && ignoredFromTypeMap[objectKey].includes('*')) || ignoredMetadata.includes('*')) {
                        xmlRoot[typeData.parentName][typeData.collection] = [];
                    } else if (ignoredFromTypeMap[objectKey]) {
                        xmlRoot[typeData.parentName][typeData.collection] = MetadataUtils.forceArray(xmlRoot[typeData.parentName][typeData.collection]);
                        let dataToRemove = [];
                        let dataToKeep = [];
                        for (let xmlElement of xmlRoot[typeData.parentName][typeData.collection]) {
                            let elementKey = xmlElement[typeData.fieldKey]
                            if (ignoredFromTypeMap[objectKey].includes(elementKey)) {
                                dataToRemove.push(xmlElement);
                            } else {
                                dataToKeep.push(xmlElement);
                            }
                        }
                        xmlRoot[typeData.parentName][typeData.collection] = dataToKeep;
                    }
                    let content;
                    if (args.compress) {
                        content = MetadataCompressor.compressAsJSON(xmlRoot);
                        if (!content)
                            content = XMLParser.toXML(xmlRoot);
                    } else {
                        content = XMLParser.toXML(xmlRoot);
                    }
                    FileWriter.createFileSync(path, content);
                }
            }
        }
    });
}

function ignoreRules(args, metadataType, ignoredMetadata, singularType) {
    let typeData = TYPES_XML_RELATION[metadataType.name];
    if (ignoredMetadata.includes('*')) {
        if (FileChecker.isExists(metadataType.path))
            FileWriter.delete(metadataType.path);
    } else {
        let ignoredFromTypeMap = MetadataFactory.createIgnoreMap(ignoredMetadata);
        if (singularType) {
            Object.keys(singularType.childs).forEach(function (objectKey) {
                if (ignoredFromTypeMap[objectKey]) {
                    if (ignoredFromTypeMap[objectKey].includes('*')) {
                        if (FileChecker.isExists(singularType.childs[objectKey].path))
                            FileWriter.delete(singularType.childs[objectKey].path);
                    } else {
                        let path = metadataType.path + '/' + objectKey + '.' + metadataType.suffix + '-meta.xml';
                        if (FileChecker.isExists(path)) {
                            let xmlRoot = XMLParser.parseXML(FileReader.readFileSync(path), false);
                            let dataToKeep = [];
                            let dataToRemove = [];
                            Object.keys(singularType.childs[objectKey].childs).forEach(function (itemKey) {
                                if (xmlRoot[metadataType.name] && xmlRoot[metadataType.name][typeData.collection]) {
                                    xmlRoot[metadataType.name][typeData.collection] = MetadataUtils.forceArray(xmlRoot[metadataType.name][typeData.collection]);
                                    for (let xmlElement of xmlRoot[metadataType.name][typeData.collection]) {
                                        let elementKey = xmlElement[typeData.fieldKey];
                                        if (ignoredFromTypeMap[objectKey] && ignoredFromTypeMap[objectKey].includes(elementKey)) {
                                            dataToRemove.push(xmlElement);
                                        } else {
                                            dataToKeep.push(xmlElement);
                                        }
                                    }
                                    xmlRoot[metadataType.name][typeData.collection] = dataToKeep;
                                }
                            });
                            if (dataToRemove.length > 0) {
                                let content;
                                if (args.compress) {
                                    content = MetadataCompressor.compressAsJSON(xmlRoot);
                                    if (!content)
                                        content = XMLParser.toXML(xmlRoot);
                                } else {
                                    content = XMLParser.toXML(xmlRoot);
                                }
                                FileWriter.createFileSync(path, content);
                            }
                        }
                    }
                }
            });
        }
    }
}

function ignoreCustomLabels(args, metadataType, ignoredMetadata) {
    let typeData = TYPES_XML_RELATION[metadataType.name];
    if (ignoredMetadata.includes('*')) {
        if (FileChecker.isExists(metadataType.path))
            FileWriter.delete(metadataType.path);
    } else {
        let ignoredFromTypeMap = MetadataFactory.createIgnoreMap(ignoredMetadata);
        let path = metadataType.childs[metadataType.name].path;
        if (FileChecker.isExists(path)) {
            let xmlRoot = XMLParser.parseXML(FileReader.readFileSync(path), false);
            if (xmlRoot[metadataType.name] && xmlRoot[metadataType.name][typeData.collection]) {
                let dataToKeep = [];
                let dataToRemove = [];
                xmlRoot[metadataType.name][typeData.collection] = MetadataUtils.forceArray(xmlRoot[metadataType.name][typeData.collection]);
                for (let xmlElement of xmlRoot[metadataType.name][typeData.collection]) {
                    let elementKey = xmlElement[typeData.fieldKey]
                    if (ignoredFromTypeMap[elementKey] && ignoredFromTypeMap[elementKey].includes(elementKey)) {
                        dataToRemove.push(xmlElement);
                    } else {
                        dataToKeep.push(xmlElement);
                    }
                }
                xmlRoot[metadataType.name][typeData.collection] = dataToKeep;
                if (dataToRemove.length > 0) {
                    let content;
                    if (args.compress) {
                        content = MetadataCompressor.compressAsJSON(xmlRoot);
                        if (!content)
                            content = XMLParser.toXML(xmlRoot);
                    } else {
                        content = XMLParser.toXML(xmlRoot);
                    }
                    FileWriter.createFileSync(path, content);
                }
            }
        }
    }
}

