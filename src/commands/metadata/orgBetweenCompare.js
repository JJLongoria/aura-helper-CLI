const Output = require('../../output');
const { ResponseBuilder, ProgressBuilder, ErrorBuilder } = require('../response');
const ErrorCodes = require('../errors');
const CommandUtils = require('../utils');
const Connection = require('@aurahelper/connector');
const { ProjectUtils, MetadataUtils, Validator } = require('@aurahelper/core').CoreUtils;
const { PathUtils, FileChecker, FileWriter } = require('@aurahelper/core').FileSystem;


let argsList = [
    "root",
    "source",
    "target",
    "outputFile",
    "apiVersion",
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
        .option('--output-file <path/to/output/file>', 'Path to file for redirect the output')
        .option('-v, --api-version <apiVersion>', 'Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the sfdx-project.json file')
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
    if (args.progress) {
        if (!CommandUtils.getProgressAvailableTypes().includes(args.progress)) {
            Output.Printer.printError(new ErrorBuilder(ErrorCodes.WRONG_ARGUMENTS).message('Wrong --progress value (' + args.progress + '). Please, select any of this vales: ' + CommandUtils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
    if (!args.source) {
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
    }
    if (args.outputFile) {
        try {
            args.outputFile = PathUtils.getAbsolutePath(args.outputFile);
        } catch (error) {
            Output.Printer.printError(new ErrorBuilder(ErrorCodes.FILE_ERROR).message('Wrong --output-file path').exception(error));
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
    if (!args.target) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS).message('Wrong --target value. You must select a target org to compare'));
        return;
    }
    compareMetadata(args).then((result) => {
        if (args.outputFile) {
            let baseDir = PathUtils.getDirname(args.outputFile);
            if (!FileChecker.isExists(baseDir))
                FileWriter.createFolderSync(baseDir);
            FileWriter.createFileSync(args.outputFile, JSON.stringify(result, null, 2));
            Output.Printer.printSuccess(new ResponseBuilder('Output saved in: ' + args.outputFile));
        } else {
            Output.Printer.printSuccess(new ResponseBuilder('Comparing Org with Local finished succesfully').data(result));
        }
    }).catch((error) => {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.COMMAND_ERROR).exception(error));
    });
}

function compareMetadata(args) {
    return new Promise(async (resolve, reject) => {
        try {
            let username = args.source;
            const projectConfig = ProjectUtils.getProjectConfig(args.root);
            if (!username)
                username = ProjectUtils.getOrgAlias(args.root);
            const connectionSource = new Connection(username, args.apiVersion, args.root, projectConfig.namespace);
            const connectionTarget = new Connection(args.target, args.apiVersion, args.root, projectConfig.namespace);
            connectionTarget.setMultiThread();
            connectionSource.setMultiThread();
            if (args.progress)
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Getting Available types on source (' + username + ')'));
            const sourceMetadataDetails = await connectionSource.listMetadataTypes();
            if (args.progress)
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Describe Metadata from source (' + username + ')'));
            connectionSource.onAfterDownloadType((status) => {
                if (args.progress)
                    Output.Printer.printProgress(new ProgressBuilder(args.progress).message('MetadataType: ' + status.entityType).increment(status.increment).percentage(status.percentage));
            });
            const sourceMetadata = await connectionSource.describeMetadataTypes(sourceMetadataDetails, false);
            if (args.progress)
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Getting Available types on target (' + args.target + ')'));
            const targetMetadataDetails = await connectionTarget.listMetadataTypes();
            if (args.progress)
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Describe Metadata from target (' + args.target + ')'));
                connectionTarget.onAfterDownloadType((status) => {
                if (args.progress)
                    Output.Printer.printProgress(new ProgressBuilder(args.progress).message('MetadataType: ' + status.entityType).increment(status.increment).percentage(status.percentage));
            });
            const targetMetadata = await connectionTarget.describeMetadataTypes(targetMetadataDetails, false);
            if (args.progress)
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Comparing Metadata Types'));
            const compareResult = MetadataUtils.compareMetadata(sourceMetadata, targetMetadata);
            resolve(compareResult);
        } catch (error) {
            reject(error);
        }
    });
}