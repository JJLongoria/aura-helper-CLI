const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const FileSystem = require('../../fileSystem');
const Config = require('../../main/config');
const Metadata = require('../../metadata');
const Languages = require('../../languages');
const ProcessManager = require('../../processes').ProcessManager;
const Utils = require('./utils');
const CommandUtils = require('../utils');
const Paths = FileSystem.Paths;
const FileChecker = FileSystem.FileChecker;
const FileReader = FileSystem.FileReader;
const MetadataFactory = Metadata.Factory;
const FileWriter = FileSystem.FileWriter;
const MetadataConnection = Metadata.Connection;
const MetadataTypes = Metadata.MetadataTypes;
const PackageGenerator = Metadata.PackageGenerator;
const MetadataCompressor = Metadata.MetadataCompressor;
const XMLParser = Languages.XMLParser;

const PACKAGE_FILENAME = 'package.xml';
const PROJECT_NAME = 'TempProject';

const SUBFOLDER_BY_METADATA_TYPE = {
    RecordType: 'recordTypes'
}

let retrievedFinished = false;

let argsList = [
    "root",
    "all",
    "type",
    "includeOrg",
    "orgNamespace",
    "compress",
    "progress",
    "beautify"
];

exports.createCommand = function (program) {
    program
        .command('metadata:local:retrieve:special')
        .description('Command for retrieve the special metadata types stored in your local project. The special types are the types generated at runtime when retrieving data from org according the package data. Files like permission sets, profiles or translations. For example, with this command you can retrieve all permissions from a profile without retrieve anything more. Also you can retrieve only the Custom Object XML Files without retrieve anything more.')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-a, --all', 'Retrieve all supported metadata types (' + Object.keys(Utils.getSpecialMetadata()).join(',') + ')')
        .option('-t, --type <MetadataTypeNames>', 'Retrieve specifics metadata types. You can choose one or a comma separated list of elements. Also you can choose retrieve a specific profile, object o record type. Schema -> "Type1" or "Type1,Type2" or "Type1:Object1, Type1:Object2" or "Type1:Object1:Item1" for example:  "Profile, PermissinSet" for retrieve all profiles and permission sets. "Profile:Admin" for retrieve the admin profile. "RecordType:Account:RecordType1" for  retrieve the RecordType1 for the object Account or "RecordType:Account" for retrieve all Record Types for Account')
        .option('-i, --include-org', 'With this option, you can retrieve the with the data from org and not only for local, but only retrieve the types that you have in your local.')
        .option('-o, --org-namespace', 'If you choose include data from org, also you can choose if include all data from the org, or only the data from your org namespace')
        .option('-c, --compress', 'Compress the retrieved files.')
        .option('-p, --progress <format>', 'Option for report the command progress. Available formats: ' + CommandUtils.getProgressAvailableTypes().join(','))
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args) {
            run(args);
        });
}

async function run(args) {
    retrievedFinished = false;
    Output.Printer.setColorized(args.beautify);
    if (CommandUtils.hasEmptyArgs(args, argsList)) {
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
        if (!CommandUtils.getProgressAvailableTypes().includes(args.progress)) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --progress value. Please, select any  of this vales: " + CommandUtils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
    let types;
    if (args.type) {
        types = Utils.getAdvanceTypes(args.type);
    }
    retrieve(args, types).then(function () {
        Output.Printer.printSuccess(Response.success("Retrieve metadata finished successfully"));
    }).catch(function (error) {
        retrievedFinished = true;
        Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
    });
}

function retrieve(args, types) {
    return new Promise(async function (resolve, reject) {
        try {
            let dataToRetrieve = [];
            Object.keys(Utils.getSpecialMetadata()).forEach(function (key) {
                if (!types || types[key]) {
                    if (!dataToRetrieve.includes(key))
                        dataToRetrieve.push(key);
                    for (let child of Utils.getSpecialMetadata()[key]) {
                        if (!dataToRetrieve.includes(child))
                            dataToRetrieve.push(child);
                    }
                }
            });
            let username = await Config.getAuthUsername(args.root);
            let metadataTypes = await MetadataConnection.getMetadataTypes(username, args.root, { forceDownload: true });
            let folderMetadataMap = MetadataFactory.createFolderMetadataMap(metadataTypes);
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Describing Local Metadata Types', args.progress));
            let metadataFromFileSystem = MetadataFactory.getMetadataObjectsFromFileSystem(folderMetadataMap, args.root);
            let metadata = JSON.parse(JSON.stringify(metadataFromFileSystem));
            if (args.includeOrg) {
                let projectConfig = Config.getProjectConfig(args.root);
                let options = {
                    orgNamespace: projectConfig.namespace,
                    downloadAll: !args.orgNamespace,
                    progressReport: args.progress
                }
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Describing Org Metadata Types', args.progress));
                let metadataFromOrg = await MetadataConnection.getSpecificMetadataFromOrg(username, dataToRetrieve, options, Output);
                metadata = MetadataFactory.combineMetadata(metadata, metadataFromOrg);
            }
            Object.keys(metadata).forEach(function (key) {
                Object.keys(metadata[key].childs).forEach(function (childsKey) {
                    metadata[key].childs[childsKey].checked = true;
                    Object.keys(metadata[key].childs[childsKey].childs).forEach(function (itemKey) {
                        metadata[key].childs[childsKey].childs[itemKey].checked = true;
                    });
                });
            });
            let path = Paths.getAuraHelperCLITempFilesPath();
            if (FileChecker.isExists(path))
                FileWriter.delete(path);
            FileWriter.createFolderSync(path);
            let createProjectOut = await ProcessManager.createSFDXProject(PROJECT_NAME, path);
            if (createProjectOut) {
                if (createProjectOut.stdOut) {
                    let projectConfig = Config.getProjectConfig(args.root);
                    let packageFile = path + '/' + PROJECT_NAME + '/manifest/' + PACKAGE_FILENAME;
                    let packageContent = PackageGenerator.createPackage(metadata, projectConfig.sourceApiVersion);
                    FileWriter.createFileSync(packageFile, packageContent);
                    let setDefaultOrgOut = await ProcessManager.setDefaultOrg(PROJECT_NAME, path + '/' + PROJECT_NAME);
                    if (setDefaultOrgOut) {
                        if (setDefaultOrgOut.stdOut) {
                            if (args.progress) {
                                Output.Printer.printProgress(Response.progress(undefined, 'Retriving Metadata Types. This operation can will take several minutes, please wait.', args.progress));
                                reportRetrieveProgress(args, 2500);
                            }
                            let retrieveOut = await ProcessManager.retrieveSFDX(username, packageFile, path + '/' + PROJECT_NAME);
                            retrievedFinished = true;
                            if (retrieveOut) {
                                if (retrieveOut.stdOut) {
                                    Object.keys(folderMetadataMap).forEach(function (folder) {
                                        let metadataType = folderMetadataMap[folder];
                                        if ((!types || types[metadataType.xmlName]) && metadataFromFileSystem[metadataType.xmlName] && Utils.getSpecialMetadata()[metadataType.xmlName]) {
                                            Object.keys(metadataFromFileSystem[metadataType.xmlName].childs).forEach(function (childKey) {
                                                if (metadataFromFileSystem[metadataType.xmlName].childs[childKey].childs && Object.keys(metadataFromFileSystem[metadataType.xmlName].childs[childKey].childs).length > 0) {
                                                    Object.keys(metadataFromFileSystem[metadataType.xmlName].childs[childKey].childs).forEach(function (itemKey) {
                                                        if (copyType(types, metadataType.xmlName, childKey, itemKey)) {
                                                            let subPath;
                                                            let fileName = itemKey + '.' + metadataType.suffix + '-meta.xml';
                                                            if (SUBFOLDER_BY_METADATA_TYPE[metadataType.xmlName]) {
                                                                subPath = '/force-app/main/default/' + metadataType.directoryName + '/' + childKey + '/' + SUBFOLDER_BY_METADATA_TYPE[metadataType.xmlName] + '/' + fileName;
                                                            } else {
                                                                subPath = '/force-app/main/default/' + metadataType.directoryName + '/' + childKey + '/' + fileName;
                                                            }
                                                            let sourceFile = path + '/' + PROJECT_NAME + subPath;
                                                            let targetFile = args.root + subPath;
                                                            let targetFolder = Paths.getFolderPath(targetFile);
                                                            if (FileChecker.isExists(sourceFile)) {
                                                                if (args.progress)
                                                                    Output.Printer.printProgress(Response.progress(undefined, 'Copying ' + fileName + ' to ' + targetFile, args.progress));
                                                                if (!FileChecker.isExists(targetFolder))
                                                                    FileWriter.createFolderSync(targetFolder);
                                                                let xmlRoot = XMLParser.parseXML(FileReader.readFileSync(sourceFile), false);
                                                                if (args.compress) {
                                                                    content = MetadataCompressor.compressAsJSON(xmlRoot);
                                                                    if (!content)
                                                                        content = XMLParser.toXML(xmlRoot);
                                                                } else {
                                                                    content = XMLParser.toXML(xmlRoot);
                                                                }
                                                                FileWriter.createFileSync(targetFile, content);
                                                            }
                                                        }
                                                    });
                                                } else {
                                                    if (copyType(types, metadataType.xmlName, childKey)) {
                                                        let subPath;
                                                        let fileName = childKey + '.' + metadataType.suffix + '-meta.xml';
                                                        if (metadataType.xmlName === MetadataTypes.CUSTOM_OBJECT) {
                                                            subPath = '/force-app/main/default/' + metadataType.directoryName + '/' + childKey + '/' + fileName
                                                        } else {
                                                            subPath = '/force-app/main/default/' + metadataType.directoryName + '/' + fileName
                                                        }
                                                        let sourceFile = path + '/' + PROJECT_NAME + subPath;
                                                        let targetFile = args.root + subPath;
                                                        let targetFolder = Paths.getFolderPath(targetFile);
                                                        if (FileChecker.isExists(sourceFile)) {
                                                            if (args.progress)
                                                                Output.Printer.printProgress(Response.progress(undefined, 'Copying ' + fileName + ' to ' + targetFile, args.progress));
                                                            if (!FileChecker.isExists(targetFolder))
                                                                FileWriter.createFolderSync(targetFolder);
                                                            let xmlRoot = XMLParser.parseXML(FileReader.readFileSync(sourceFile), false);
                                                            if (args.compress) {
                                                                content = MetadataCompressor.compressAsJSON(xmlRoot);
                                                                if (!content)
                                                                    content = XMLParser.toXML(xmlRoot);
                                                            } else {
                                                                content = XMLParser.toXML(xmlRoot);
                                                            }
                                                            FileWriter.createFileSync(targetFile, content);
                                                        }
                                                    }
                                                }
                                            });
                                        }
                                    });
                                    resolve();
                                } else {
                                    reject(retrieveOut.stdErr);
                                }
                            } else {
                                reject('Operation cancelled');
                            }
                        } else {
                            reject(setDefaultOrgOut.stdErr);
                        }
                    } else {
                        reject('Operation cancelled');
                    }
                } else {
                    reject(createProjectOut.stdErr);
                }
            } else {
                reject('Operation cancelled');
            }
        } catch (error) {
            reject(error);
        }
    });
}

function reportRetrieveProgress(args, millis) {
    if (!retrievedFinished) {
        setTimeout(function () {
            if (!retrievedFinished) {
                Output.Printer.printProgress(Response.progress(undefined, '(' + new Date().getTime() + ') Retrieve in progress. Please wait.', args.progress));
                reportRetrieveProgress(args, millis);
            }
        }, millis);
    }
}

function copyType(types, metadataType, object, item) {
    if (!types)
        return true;
    if (types[metadataType]) {
        if (!item) {
            if (types[metadataType]['*']) {
                return true;
            } else if (types[metadataType][object] && (types[metadataType][object].includes(object) || types[metadataType][object].includes('*'))) {
                return true;
            }
        } else {
            if (types[metadataType]['*']) {
                return true;
            } else if (types[metadataType][object] && (types[metadataType][object].includes(item) || types[metadataType][object].includes('*'))) {
                return true;
            }
        }
    }
    return false;
}

