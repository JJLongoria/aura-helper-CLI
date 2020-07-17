const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const FileSystem = require('../../fileSystem');
const Config = require('../../main/config');
const Metadata = require('../../metadata');
const Utils = require('./utils');
const CommandUtils = require('../utils');
const { group } = require('console');
const Paths = FileSystem.Paths;
const FileChecker = FileSystem.FileChecker;
const MetadataFactory = Metadata.Factory;
const FileWriter = FileSystem.FileWriter;
const MetadataConnection = Metadata.Connection;
const MetadataUtils = Metadata.Utils;


let argsList = [
    "root",
    "source",
    "target",
    "outputFile",
    "progress",
    "beautify"
];

exports.createCommand = function (program) {
    program
        .command('metadata:org:compare:between')
        .description('Command for compare two organization to get the differences. Return the metadata that exists on target but not exists on source')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-s, --source <sourceUsernameOrAlias>', 'Source Salesforce org to compare. If you want to compare your active org with other, this options is not necessary because use the --root option for get the project\'s auth org. If you choose source, --root will be ignored')
        .option('-t, --target <targetUsernameOrAlias>', 'Target Salesforce org to compare.')
        .option('-p, --progress <format>', 'Option for report the command progress. Available formats: ' + CommandUtils.getProgressAvailableTypes().join(','))
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .option('--output-file <path/to/output/file>', 'Path to file for redirect the output')
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
    if (!args.source) {
        try {
            args.root = Paths.getAbsolutePath(args.root);
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --root path. Select a valid path'));
            return;
        }
        if (!FileChecker.isSFDXRootPath(args.root)) {
            Output.Printer.printError(Response.error(ErrorCodes.PROJECT_NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND.message + args.root));
            return;
        }
    }
    if (args.outputFile) {
        try {
            args.outputFile = Paths.getAbsolutePath(args.outputFile);
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --output-file path. Select a valid path'));
            return;
        }
    }
    if (args.progress) {
        if (!CommandUtils.getProgressAvailableTypes().includes(args.progress)) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --progress value. Please, select any  of this vales: " + CommandUtils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
    if (!args.target) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --target value. You must select a target org to compare"));
        return;
    }
    compareMetadata(args).then((result) => {
        if (args.outputFile) {
            let baseDir = Paths.getFolderPath(args.outputFile);
            if (!FileChecker.isExists(baseDir))
                FileWriter.createFolderSync(baseDir);
            FileWriter.createFileSync(args.outputFile, JSON.stringify(result, null, 2));
        } else {
            Output.Printer.printSuccess(Response.success("Comparing Org with Local finished succesfully", result));
        }
    }).catch((error) => {
        Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
    });
}

function compareMetadata(args) {
    return new Promise(async (resolve, reject) => {
        try {
            let username = args.source;
            if (!username)
                username = await Config.getAuthUsername(args.root);
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Getting Available types on source (' + username + ')', args.progress));
            let sourceMetadataTypes = await MetadataConnection.getMetadataTypes(username, args.root, { forceDownload: true, createFile: false });
            let sourceTypes = getTypes(sourceMetadataTypes.metadataTypes);
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Describe Metadata from source (' + username + ')', args.progress));
            let sourceMetadata = await describeOrgMetadata(args, username, sourceMetadataTypes.namespace, sourceTypes);
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Getting Available types on target (' + args.target + ')', args.progress));
            let targetMetadataTypes = await MetadataConnection.getMetadataTypes(args.target, args.root, { forceDownload: true, createFile: false });
            let targetTypes = getTypes(targetMetadataTypes.metadataTypes);
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Describe Metadata from target (' + args.target + ')', args.progress));
            let targetMetadata = await describeOrgMetadata(args, args.target, targetMetadataTypes.namespace, targetTypes);
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Comparing Metadata Types', args.progress));
            let compareResult = MetadataUtils.compareMetadata(sourceMetadata, targetMetadata);
            resolve(compareResult);
        } catch (error) {
            reject(error);
        }
    });
}

function describeOrgMetadata(args, username, namespace, metadataTypes) {
    return new Promise(async (resolve, reject) => {
        try {
            let options = {
                orgNamespace: namespace,
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

function getTypes(objects){
    let types = [];
    for(let obj of objects){
        types.push(obj.xmlName);
    }
    return types;
}