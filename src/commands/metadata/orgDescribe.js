const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const Config = require('../../main/config');
const AppUtils = require('./utils');
const CommandUtils = require('../utils');
const { PathUtils, FileChecker, FileWriter } = require('@ah/core').FileSystem;
const Connection = require('@ah/connector');
const { ProjectUtils } = require('@ah/core').Utils;


let argsList = [
    "root",
    "all",
    "type",
    "orgNamespace",
    "outputFile",
    "apiVersion",
    "progress",
    "beautify"
];

exports.createCommand = function (program) {
    program
        .command('metadata:org:describe')
        .description('Command for describe all or specific Metadata Types likes Custom Objects, Custom Fields, Apex Classes... that you have in your auth org')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-a, --all', 'Describe all metadata types')
        .option('-t, --type <MetadataTypeNames>', 'Describe the specified metadata types. You can select a single metadata or a list separated by commas. This option does not take effect if you choose describe all')
        .option('-o, --org-namespace', 'Describe only metadata types from your org namespace')
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
    if (args.all == undefined && args.type === undefined) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "You must select describe all or describe specific types"));
        return;
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
    describeMetadata(args).then(function (result) {
        if (args.outputFile) {
            args.outputFile = PathUtils.getAbsolutePath(args.outputFile);
            let baseDir = PathUtils.getDirname(args.outputFile);
            if (!FileChecker.isExists(baseDir))
                FileWriter.createFolderSync(baseDir);
            FileWriter.createFileSync(args.outputFile, JSON.stringify(result, null, 2));
        } else {
            Output.Printer.printSuccess(Response.success("Describe Metadata Types finished successfully", result));
        }
    }).catch(function (error) {
        Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
    });
}

function describeMetadata(args) {
    return new Promise(async function (resolve, reject) {
        try {
            const username = await Config.getAuthUsername(args.root);
            const projectConfig = ProjectUtils.getProjectConfig(args.root);
            const connection = new Connection(username, args.apiVersion, args.root, projectConfig.namespace);
            connection.setMultiThread();
            let types;
            if (args.all) {
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Getting All Available Metadata Types', args.progress));
                types = [];
                const metadataTypes = await connection.listMetadataTypes();
                for (const type of metadataTypes) {
                    types.push(type);
                }
            } else if (args.type) {
                types = AppUtils.getTypes(args.type);
            }
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Describing Org Metadata Types', args.progress));
            const metadata = await connection.describeMetadataTypes(types, !args.orgNamespace, function (status) {
                if (status.stage === 'afterDownload') {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(status.percentage, 'MetadataType: ' + status.typeOrObject, args.progress));
                }
            });
            resolve(metadata);
        } catch (error) {
            reject(error);
        }
    });
}