const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const Config = require('../../main/config');
const CommandUtils = require('../utils');
const Connection = require('@ah/connector');
const { Utils, ProjectUtils } = require('@ah/core').Utils;
const { PathUtils, FileChecker, FileWriter } = require('@ah/core').FileSystem;


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
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS));
        return;
    }
    if (!args.source) {
        try {
            args.root = PathUtils.getAbsolutePath(args.root);
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
    if (!args.target) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --target value. You must select a target org to compare"));
        return;
    }
    compareMetadata(args).then((result) => {
        if (args.outputFile) {
            let baseDir = PathUtils.getDirname(args.outputFile);
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
            const projectConfig = ProjectUtils.getProjectConfig(args.root);
            const connectionSource = new Connection(username, args.apiVersion, args.root, projectConfig.namespace);
            const connectionTarget = new Connection(args.target, args.apiVersion, args.root, projectConfig.namespace);
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Getting Available types on source (' + username + ')', args.progress));
            const sourceMetadataDetails = await connectionSource.listMetadataTypes();
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Describe Metadata from source (' + username + ')', args.progress));
            const sourceMetadata = await connectionSource.describeMetadataTypes(sourceMetadataDetails, false, function (status) {
                if (status.stage === 'afterDownload') {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(status.percentage, 'MetadataType: ' + status.typeOrObject, args.progress));
                }
            });
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Getting Available types on target (' + args.target + ')', args.progress));
            const targetMetadataDetails = await connectionTarget.listMetadataTypes();
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Describe Metadata from target (' + args.target + ')', args.progress));
            const targetMetadata = await connectionTarget.describeMetadataTypes(targetMetadataDetails, false, function (status) {
                if (status.stage === 'afterDownload') {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(status.percentage, 'MetadataType: ' + status.typeOrObject, args.progress));
                }
            });
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Comparing Metadata Types', args.progress));
            const compareResult = Utils.compareMetadata(sourceMetadata, targetMetadata);
            resolve(compareResult);
        } catch (error) {
            reject(error);
        }
    });
}