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
const FileWriter = FileSystem.FileWriter;
const MetadataFactory = Metadata.Factory;
const MetadataConnection = Metadata.Connection;

let argsList = [
    "root",
    "outputFile",
    "progress",
    "beautify"
];

exports.createCommand = function (program) {
    program
        .command('metadata:local:list')
        .description('Command for list all metadata from the local project')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
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
    try {
        args.root = Paths.getAbsolutePath(args.root);
    } catch (error) {
        Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --root path. Select a valid path'));
        return;
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
    if (!FileChecker.isSFDXRootPath(args.root)) {
        Output.Printer.printError(Response.error(ErrorCodes.PROJECT_NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND.message + args.root));
        return;
    }
    listLocalMetadata(args).then(function (result) {
        if (args.outputFile) {
            args.outputFile = Paths.getAbsolutePath(args.outputFile);
            let baseDir = Paths.getFolderPath(args.outputFile);
            if (!FileChecker.isExists(baseDir))
                FileWriter.createFolderSync(baseDir);
            FileWriter.createFileSync(args.outputFile, JSON.stringify(result, null, 2));
        }
        Output.Printer.printSuccess(Response.success("List Metadata Types finished successfully", result));
    }).catch(function (error) {
        Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
    });
}

function listLocalMetadata(args) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Getting All Available Metadata Types', args.progress));
            let metadata = [];
            let username = await Config.getAuthUsername(args.root);
            let metadataTypes = await MetadataConnection.getMetadataTypes(username, args.root, { forceDownload: false });
            let folderMetadataMap = MetadataFactory.createFolderMetadataMap(metadataTypes);
            let metadataFromFileSystem = MetadataFactory.getMetadataObjectsFromFileSystem(folderMetadataMap, args.root);
            Object.keys(folderMetadataMap).forEach(function (folder) {
                let metadataType = folderMetadataMap[folder];
                if (metadataFromFileSystem[metadataType.xmlName])
                    metadata.push(metadataType);
            });
            resolve(metadata);
        } catch (error) {
            reject(error);
        }
    });
}