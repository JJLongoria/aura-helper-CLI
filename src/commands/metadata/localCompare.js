const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const FileSystem = require('../../fileSystem');
const Config = require('../../main/config');
const Metadata = require('../../metadata');
const Utils = require('./utils');
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
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-p, --progress [format]', 'Option for report the command progress. Available formats: ' + Utils.getProgressAvailableTypes().join(','))
        .option('-s, --send-to <path/to/output/file>', 'Path to file for redirect the output')
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args) {
            run(args);
        });
}

async function run(args) {
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
    if (args.progress) {
        if (!Utils.getProgressAvailableTypes().includes(args.progress)) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --progress value. Please, select any  of this vales: " + Utils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
    compareMetadata(args).then(function (result) {
        if (args.sendTo) {
            let baseDir = Paths.getFolderPath(args.sendTo);
            if (!FileChecker.isExists(baseDir))
                FileWriter.createFolderSync(baseDir);
            FileWriter.createFileSync(args.sendTo, JSON.stringify(result, null, 2));
        } else {
            Output.Printer.printSuccess(Response.success("Comparing Local with Org finished succesfully", result));
        }
    }).catch(function (error) {
        Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
    });
}

function hasEmptyArgs(args) {
    return args.root === undefined && args.sendTo === undefined && args.progress === undefined;
}

function compareMetadata(args) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Describe Local Metadata', args.progress));
            let username = await Config.getAuthUsername(args.root);
            let metadataTypes = await MetadataConnection.getMetadataTypes(username, args.root, { forceDownload: true });
            let folderMetadataMap = MetadataFactory.createFolderMetadataMap(metadataTypes);
            let typesFromLocal = await describeLocalMetadata(args, folderMetadataMap);
            let objectNames = Object.keys(typesFromLocal);
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Describe Org Metadata', args.progress));
            let typesFromOrg = await describeOrgMetadata(args, username, objectNames);
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Comparing Metadata Types', args.progress));
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