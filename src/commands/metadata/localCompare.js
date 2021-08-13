const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const CommandUtils = require('../utils');
const { PathUtils, FileChecker, FileWriter } = require('@ah/core').FileSystem;
const TypesFactory = require('@ah/metadata-factory');
const { MetadataUtils, ProjectUtils } = require('@ah/core').CoreUtils;
const { ProgressStatus } = require('@ah/core').Types;
const Connection = require('@ah/connector');

let argsList = [
    "root",
    "outputFile",
    "progress",
    "beautify"
];

exports.createCommand = function (program) {
    program
        .command('metadata:local:compare')
        .description('Command to compare the organization\'s metadata with local metadata. Returns metadata that does not exist in auth org but exists in local.')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
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
        if (args.outputFile) {
            let baseDir = PathUtils.getDirname(args.outputFile);
            if (!FileChecker.isExists(baseDir))
                FileWriter.createFolderSync(baseDir);
            FileWriter.createFileSync(args.outputFile, JSON.stringify(result, null, 2));
        } else {
            Output.Printer.printSuccess(Response.success("Comparing Local with Org finished succesfully", result));
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
            const username = ProjectUtils.getOrgAlias(args.root);
            const connection = new Connection(username, undefined, args.root);
            connection.setMultiThread();
            const metadataDetails = await connection.listMetadataTypes();
            const folderMetadataMap = TypesFactory.createFolderMetadataMap(metadataDetails);
            const typesFromLocal = TypesFactory.createMetadataTypesFromFileSystem(folderMetadataMap, args.root);
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Describe Org Metadata', args.progress));
            const typesFromOrg = await connection.describeMetadataTypes(metadataDetails, false, function (progress) {
                progress = new ProgressStatus(progress);
                if (progress.isOnAfterDownloadStage()) {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(progress.percentage, 'MetadataType: ' + progress.entityType, args.progress));
                }
            });
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Comparing Metadata Types', args.progress));
            const compareResult = MetadataUtils.compareMetadata(typesFromOrg, typesFromLocal);
            resolve(compareResult);
        } catch (error) {
            reject(error);
        }
    });
}