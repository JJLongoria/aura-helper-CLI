const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const FileSystem = require('../../fileSystem');
const Config = require('../../main/config');
const Metadata = require('../../metadata');
const Utils = require('./utils');
const CommandUtils = require('../utils');
const Paths = FileSystem.Paths;
const FileChecker = FileSystem.FileChecker;
const MetadataFactory = Metadata.Factory;
const FileWriter = FileSystem.FileWriter;
const MetadataConnection = Metadata.Connection;
const MetadataUtils = Metadata.Utils;

let argsList = [
    "root",
    "sendTo",
    "progress",
    "beautify"
];

exports.createCommand = function (program) {
    program
        .command('metadata:org:compare')
        .description('Command for compare your local project with your auth org for get the differences. The result are the metadata types and objects that you have in your org, but don\'t have in your local project.')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-p, --progress <format>', 'Option for report the command progress. Available formats: ' + CommandUtils.getProgressAvailableTypes().join(','))
        .option('-s, --send-to <path/to/output/file>', 'Path to file for redirect the output')
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args) {
            run(args);
        });
}

async function run(args) {
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
        if (!CommandUtils.getProgressAvailableTypes().includes(args.progress)) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --progress value. Please, select any  of this vales: " + CommandUtils.getProgressAvailableTypes().join(',')));
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
            Output.Printer.printSuccess(Response.success("Comparing Org with Local finished succesfully", result));
        }
    }).catch(function (error) {
        Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
    });
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
            let compareResult = MetadataUtils.compareMetadata(typesFromLocal, typesFromOrg);
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