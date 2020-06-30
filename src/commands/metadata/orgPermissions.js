const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const FileSystem = require('../../fileSystem');
const Config = require('../../main/config');
const Metadata = require('../../metadata');
const Utils = require('./utils');
const CommandUtils = require('../utils');
const Languages = require('../../languages');
const ProcessManager = require('../../processes').ProcessManager;
const MetadataTypes = Metadata.MetadataTypes;
const MetadataUtils = Metadata.Utils;
const Paths = FileSystem.Paths;
const FileChecker = FileSystem.FileChecker;
const FileWriter = FileSystem.FileWriter;
const FileReader = FileSystem.FileReader;
const PackageGenerator = Metadata.PackageGenerator;
const XMLParser = Languages.XMLParser;
const MetadataFactory = Metadata.Factory;

const PACKAGE_FILENAME = 'package.xml';
const PROJECT_NAME = 'TempProject';

let argsList = [
    "root",
    "apiVersion",
    "progress",
    "compress"
];

let retrievedFinished = false;

exports.createCommand = function (program) {
    program
        .command('metadata:org:permissions')
        .description('Command for get all User Permissions available in the auth org.')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-v, --api-version <apiVersion>', 'Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the sfdx-project.json file')
        .option('-p, --progress <format>', 'Option for report the command progress. Available formats: ' + CommandUtils.getProgressAvailableTypes().join(','))
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args) {
            run(args);
        });
}

function run(args) {
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
    if (args.apiVersion) {
        args.apiVersion = CommandUtils.getApiVersion(args.apiVersion);
        if (!args.apiVersion) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --api-version selected. Please, select a positive integer or decimal number'));
            return;
        }
    } else {
        let projectConfig = Config.getProjectConfig(args.root);
        args.apiVersion = projectConfig.sourceApiVersion;
    }
    if (args.progress) {
        if (!CommandUtils.getProgressAvailableTypes().includes(args.progress)) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --progress value. Please, select any  of this vales: " + CommandUtils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
    loadPermissions(args).then(function (result) {
        Output.Printer.printSuccess(Response.success('Available User permissions loaded succesfully', result));
    }).catch(function (error) {
        Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
    });
}

function loadPermissions(args) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.progress) {
                Output.Printer.printProgress(Response.progress(undefined, 'Loading user permissions started.', args.progress));
                reportRetrieveProgress(args, 2500);
            }
            let username = await Config.getAuthUsername(args.root);
            let metadata = {};
            let metadataType = MetadataFactory.createMetadataType(MetadataTypes.PROFILE, true);
            metadataType.childs["Admin"] = MetadataFactory.createMetadataObject("Admin", true);
            metadata[MetadataTypes.PROFILE] = metadataType;
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
                            let retrieveOut = await ProcessManager.retrieveSFDX(username, packageFile, path + '/' + PROJECT_NAME);
                            retrievedFinished = true;
                            if (retrieveOut) {
                                if (retrieveOut.stdOut) {
                                    let result = [];
                                    let xmlRoot = XMLParser.parseXML(FileReader.readFileSync(args.root + '/force-app/main/default/profiles/Admin.profile-meta.xml'), true);
                                    if(xmlRoot[MetadataTypes.PROFILE] && xmlRoot[MetadataTypes.PROFILE].userPermissions){
                                        let permissions = MetadataUtils.forceArray(xmlRoot[MetadataTypes.PROFILE].userPermissions);
                                        for(let permission of permissions){
                                            result.push(permission.name);
                                        }
                                    }
                                    resolve(result);
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
            retrievedFinished  = true;
            reject(error);
        }
    });
}

function reportRetrieveProgress(args, millis) {
    if (!retrievedFinished) {
        setTimeout(function () {
            if (!retrievedFinished) {
                Output.Printer.printProgress(Response.progress(undefined, '(' + new Date().getTime() + ') Loading Permissions in progress. Please wait.', args.progress));
                reportRetrieveProgress(args, millis);
            }
        }, millis);
    }
}