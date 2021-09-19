const Output = require('../../output');
const { ResponseBuilder, ProgressBuilder, ErrorBuilder } = require('../response');
const ErrorCodes = require('../errors');
const CommandUtils = require('../utils');
const { PathUtils, FileChecker, FileWriter } = require('@aurahelper/core').FileSystem;
const { ProjectUtils, Validator } = require('@aurahelper/core').CoreUtils;
const Connection = require('@aurahelper/connector');

let argsList = [
    "root",
    "outputFile",
    "apiVersion",
    "progress",
    "beautify"
];

exports.createCommand = function (program) {
    program
        .command('metadata:org:list')
        .description('Command for list all metadata from the auth org')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('--output-file <path/to/output/file>', 'Path to file for redirect the output')
        .option('-v, --api-version <apiVersion>', 'Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the sfdx-project.json file')
        .option('-p, --progress <format>', 'Option for report the command progress. Available formats: ' + CommandUtils.getProgressAvailableTypes().join(','))
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args) {
            run(args);
        });
}

async function run(args) {
    try {
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
                Output.Printer.printError(new ErrorBuilder(ErrorCodes.FILE_ERROR).message('Wrong --output-file path. Select a valid path'));
                return;
            }
        }
        if (args.apiVersion) {
            try {
                args.apiVersion = ProjectUtils.getApiAsString(args.apiVersion);
            } catch (error) {
                Output.Printer.printError(new ErrorBuilder(ErrorCodes.WRONG_ARGUMENTS).message('Wrong --api-version selected').exception(error));
            }
        } else {
            let projectConfig = ProjectUtils.getProjectConfig(args.root);
            args.apiVersion = projectConfig.sourceApiVersion;
        }
        listOrgMetadata(args).then(function (result) {
            if (args.outputFile) {
                args.outputFile = PathUtils.getAbsolutePath(args.outputFile);
                let baseDir = PathUtils.getDirname(args.outputFile);
                if (!FileChecker.isExists(baseDir))
                    FileWriter.createFolderSync(baseDir);
                FileWriter.createFileSync(args.outputFile, JSON.stringify(metadataTypes, null, 2));
                Output.Printer.printSuccess(new ResponseBuilder('Output saved in: ' + args.outputFile));
            } else {
                Output.Printer.printSuccess(new ResponseBuilder('List Metadata Types finished successfully').data(result));
            }
        }).catch(function (error) {
            Output.Printer.printError(new ErrorBuilder(ErrorCodes.COMMAND_ERROR).exception(error));
        });
    } catch (error) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.COMMAND_ERROR).exception(error));
    }

}

function listOrgMetadata(args) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.progress)
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Getting All Available Metadata Types'));
            const username = ProjectUtils.getOrgAlias(args.root);
            const connection = new Connection(username, args.apiVersion, args.root, undefined);
            const metadataDetails = await connection.listMetadataTypes();
            resolve(metadataDetails);
        } catch (error) {
            reject(error);
        }
    });
}