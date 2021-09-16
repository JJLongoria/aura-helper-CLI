const Output = require('../../output');
const { ResponseBuilder, ProgressBuilder, ErrorBuilder } = require('../response');
const ErrorCodes = require('../errors');
const CommandUtils = require('../utils');
const { PathUtils, FileChecker, FileWriter } = require('@ah/core').FileSystem;
const TypesFactory = require('@ah/metadata-factory');
const { MetadataUtils, ProjectUtils, Validator } = require('@ah/core').CoreUtils;
const Connection = require('@ah/connector');

const argsList = [
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
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS));
        return;
    }
    try {
        args.root = Validator.validateFolderPath(args.root);
    } catch (error) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.FOLDER_ERROR).message('Wrong --root path (' + args.root + ')').exception(error));
        return;
    }
    if (!FileChecker.isSFDXRootPath(args.root)) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.PROJECT_NOT_FOUND).message(args.root));
        return;
    }
    if (args.progress) {
        if (!CommandUtils.getProgressAvailableTypes().includes(args.progress)) {
            Output.Printer.printError(new ErrorBuilder(ErrorCodes.WRONG_ARGUMENTS).message('Wrong --progress value (' + args.progress + '). Please, select any of this vales: ' + CommandUtils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
    if (args.outputFile) {
        try {
            args.outputFile = PathUtils.getAbsolutePath(args.outputFile);
        } catch (error) {
            Output.Printer.printError(new ErrorBuilder(ErrorCodes.FILE_ERROR).message('Wrong --output-file path').exception(error));
            return;
        }
    }

    compareMetadata(args).then(function (result) {
        if (args.outputFile) {
            let baseDir = PathUtils.getDirname(args.outputFile);
            if (!FileChecker.isExists(baseDir))
                FileWriter.createFolderSync(baseDir);
            FileWriter.createFileSync(args.outputFile, JSON.stringify(result, null, 2));
            Output.Printer.printSuccess(new ResponseBuilder('Output saved in ' + args.outputFile));
        } else {
            Output.Printer.printSuccess(new ResponseBuilder('Comparing Local with Org finished succesfully').data(result));
        }
    }).catch(function (error) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.COMMAND_ERROR).exception(error));
    });
}

function compareMetadata(args) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.progress)
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Describe Local Metadata'));
            const username = ProjectUtils.getOrgAlias(args.root);
            const connection = new Connection(username, undefined, args.root);
            connection.setMultiThread();
            const metadataDetails = await connection.listMetadataTypes();
            const folderMetadataMap = TypesFactory.createFolderMetadataMap(metadataDetails);
            const typesFromLocal = TypesFactory.createMetadataTypesFromFileSystem(folderMetadataMap, args.root);
            if (args.progress)
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Describe Org Metadata'));
            connection.onAfterDownloadType((status) => {
                if (args.progress)
                    Output.Printer.printProgress(new ProgressBuilder(args.progress).message('MetadataType: ' + status.entityType).increment(status.increment).percentage(status.percentage));
            });
            const typesFromOrg = await connection.describeMetadataTypes(metadataDetails, false);
            if (args.progress)
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Comparing Metadata Types'));
            const compareResult = MetadataUtils.compareMetadata(typesFromOrg, typesFromLocal);
            resolve(compareResult);
        } catch (error) {
            reject(error);
        }
    });
}