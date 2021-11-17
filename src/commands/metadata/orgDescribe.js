const Output = require('../../output');
const { ResponseBuilder, ProgressBuilder, ErrorBuilder } = require('../response');
const ErrorCodes = require('../errors');
const MetadataCommandUtils = require('./utils');
const CommandUtils = require('../utils');
const { PathUtils, FileChecker, FileWriter } = require('@aurahelper/core').FileSystem;
const Connection = require('@aurahelper/connector');
const { ProjectUtils, Validator } = require('@aurahelper/core').CoreUtils;


let argsList = [
    "root",
    "all",
    "type",
    "orgNamespace",
    "outputFile",
    "apiVersion",
    "progress",
    "beautify",
    "group",
];

exports.createCommand = function (program) {
    program
        .command('metadata:org:describe')
        .description('Command to describe all or specific Metadata Types likes Custom Objects, Custom Fields, Apex Classes... that you have in your auth org')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-a, --all', 'Describe all metadata types')
        .option('-t, --type <MetadataTypeNames>', 'Describe the specified metadata types. You can select a single metadata or a list separated by commas. This option does not take effect if you choose describe all')
        .option('-o, --org-namespace', 'Describe only metadata types from your org namespace')
        .option('-g, --group', 'Option to group global Quick Actions into GlobalActions group, false to list as object and item')
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
    if (args.all == undefined && args.type === undefined) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS).message('You must select describe all or describe specific types'));
        return;
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
    describeMetadata(args).then(function (result) {
        if (args.outputFile) {
            args.outputFile = PathUtils.getAbsolutePath(args.outputFile);
            let baseDir = PathUtils.getDirname(args.outputFile);
            if (!FileChecker.isExists(baseDir))
                FileWriter.createFolderSync(baseDir);
            FileWriter.createFileSync(args.outputFile, JSON.stringify(result, null, 2));
            Output.Printer.printSuccess(new ResponseBuilder('Output saved in: ' + args.outputFile));
        } else {
            Output.Printer.printSuccess(new ResponseBuilder('Describe Metadata Types finished successfully').data(result));
        }
    }).catch(function (error) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.COMMAND_ERROR).exception(error));
    });
}

function describeMetadata(args) {
    return new Promise(async function (resolve, reject) {
        try {
            const username = ProjectUtils.getOrgAlias(args.root);
            const projectConfig = ProjectUtils.getProjectConfig(args.root);
            const connection = new Connection(username, args.apiVersion, args.root, projectConfig.namespace);
            connection.setMultiThread();
            let types;
            if (args.all) {
                if (args.progress)
                    Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Getting All Available Metadata Types'));
                types = [];
                const metadataTypes = await connection.listMetadataTypes();
                for (const type of metadataTypes) {
                    types.push(type);
                }
            } else if (args.type) {
                types = MetadataCommandUtils.getTypes(args.type);
            }
            if (args.progress)
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Describing Org Metadata Types'));
            connection.onAfterDownloadType((status) => {
                if (args.progress)
                    Output.Printer.printProgress(new ProgressBuilder(args.progress).message('MetadataType: ' + status.entityType).increment(status.increment).percentage(status.percentage));
            });
            const metadata = await connection.describeMetadataTypes(types, !args.orgNamespace, args.group);
            resolve(metadata);
        } catch (error) {
            reject(error);
        }
    });
}