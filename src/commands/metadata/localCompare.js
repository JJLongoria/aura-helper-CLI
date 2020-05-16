const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const FileSystem = require('../../fileSystem');
const Config = require('../../main/config');
const Metadata = require('../../metadata');
const Paths = FileSystem.Paths;
const FileChecker = FileSystem.FileChecker;
const MetadataFactory = Metadata.Factory;
const FileWriter = FileSystem.FileWriter;
const MetadataConnection = Metadata.Connection;
const MetadataUtils = Metadata.Utils;

exports.createCommand = function (program) {
    program
        .command('metadata:local:compare')
        .description('Command to compare the organization\'s metadata with local metadata. Returns metadata that does not exist in auth org but exists in local.')
        .option('-r, --root <path/to/project/root>', 'Path to project root', './')
        .option('-p, --progress [format]', 'Option for report the download progress. Available formats: json, plaintext', 'json')
        .option('-s, --send-to <path/to/output/file>', 'Path to file for redirect the output')
        .action(function (args) {
            run(args);
        });
}

async function run(args) {
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
    if (args.sendTo) {
        try {
            args.sendTo = Paths.getAbsolutePath(args.sendTo);
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --send-to path. Select a valid path'));
            return;
        }
    }
    if (!FileChecker.isSFDXRootPath(args.root)) {
        Output.Printer.printError(Response.error(ErrorCodes.PROJECT_NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND.message + args.root));
        return;
    }
    describeMetadata(args).then(function (result) {
        if (args.sendTo) {
            let baseDir = Paths.getFolderPath(args.sendTo);
            if (!FileChecker.isExists(baseDir))
                FileWriter.createFolderSync(baseDir);
            FileWriter.createFileSync(args.sendTo, JSON.stringify(result, null, 2));
        } else {
            Output.Printer.printSuccess(Response.success("Describe Metadata Types finished successfully", result));
        }
    }).catch(function (error) {
        Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
    });
}

function hasEmptyArgs(args) {
    return args.root === undefined && args.sendTo === undefined && args.progress === undefined;
}

function describeMetadata(args) {
    return new Promise(async function (resolve, reject) {
        try {
            let username = await Config.getAuthUsername(args.root);
            let metadataTypes = await MetadataConnection.getMetadataTypes(username, args.root, { forceDownload: true });
            let folderMetadataMap = MetadataFactory.createFolderMetadataMap(metadataTypes);
            let typesFromLocal = await describeLocalMetadata(args, folderMetadataMap);
            let objectNames = Object.keys(typesFromLocal);
            let typesFromOrg = await describeOrgMetadata(args, username, objectNames);
            let compareResult = MetadataUtils.compareMetadata(typesFromOrg, typesFromLocal);
            resolve(compareResult);
        } catch (error) {
            reject(error);
        }
    });
}

function describeOrgMetadata(args, username, metadataTypes) {
    return new Promise(async function (resolve, reject) {
        try {
            let projectConfig = Config.getProjectConfig(args.root);
            let options = {
                orgNamespace: projectConfig.namespace,
                downloadAll: false,
                progressReport: args.progress
            }
            let metadata = await MetadataConnection.getSpecificMetadataFromOrg(username, metadataTypes, options, Output);
            resolve(metadata);
        } catch (error) {
            reject(error);
        }
    });
}

function describeLocalMetadata(args, folderMetadataMap) {
    return new Promise(function (resolve, reject) {
        try {
            let metadataFromFileSystem = MetadataFactory.getMetadataObjectsFromFileSystem(folderMetadataMap, args.root);
            resolve(metadataFromFileSystem);
        } catch (error) {
            reject(error);
        }
    });
}