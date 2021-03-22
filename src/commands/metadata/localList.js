const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const Config = require('../../main/config');
const CommandUtils = require('../utils');
const { PathUtils, FileChecker, FileWriter } = require('@ah/core').FileSystem;
const { TypesFactory } = require('@ah/core').Types;
const { ProjectUtils } = require('@ah/core').Utils;
const Connection = require('@ah/connector');

let argsList = [
    "root",
    "outputFile",
    "apiVersion",
    "progress",
    "beautify"
];

exports.createCommand = function (program) {
    program
        .command('metadata:local:list')
        .description('Command for list all metadata from the local project')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-v, --api-version <apiVersion>', 'Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the sfdx-project.json file')
        .option('--output-file <path/to/output/file>', 'Path to file for redirect the output')
        .option('-p, --progress <format>', 'Option for report the command progress. Available formats: ' + CommandUtils.getProgressAvailableTypes().join(','))
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
        args.root = PathUtils.getAbsolutePath(args.root);
    } catch (error) {
        Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --root path. Select a valid path'));
        return;
    }
    if (args.outputFile) {
        try {
            args.outputFile = PathUtils.getAbsolutePath(args.outputFile);
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --output-file path. Select a valid path'));
            return;
        }
    }
    if (args.apiVersion) {
        args.apiVersion = CommandUtils.getApiVersion(args.apiVersion);
        if (!args.apiVersion) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --api-version selected. Please, select a positive integer or decimal number'));
            return;
        }
    } else {
        let projectConfig = ProjectUtils.getProjectConfig(args.root);
        args.apiVersion = projectConfig.sourceApiVersion;
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
            args.outputFile = PathUtils.getAbsolutePath(args.outputFile);
            let baseDir = PathUtils.getDirname(args.outputFile);
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
            const username = await Config.getAuthUsername(args.root);
            const connection = new Connection(username, args.apiVersion, args.root);
            const metadataDetails = await connection.listMetadataTypes();
            const folderMetadataMap = TypesFactory.createFolderMetadataMap(metadataDetails);
            const metadataFromFileSystem = TypesFactory.createMetadataTypesFromFileSystem(folderMetadataMap, args.root);
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