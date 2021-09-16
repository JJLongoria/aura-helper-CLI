const Output = require('../../output');
const { ResponseBuilder, ProgressBuilder, ErrorBuilder } = require('../response');
const ErrorCodes = require('../errors');
const { PathUtils, FileChecker, FileWriter } = require('@ah/core').FileSystem;
const TypesFactory = require('@ah/metadata-factory');
const { ProjectUtils, Validator } = require('@ah/core').CoreUtils;
const Connection = require('@ah/connector');
const MetadataCommandUtils = require('./utils');
const CommandUtils = require('../utils');

let argsList = [
    "root",
    "all",
    "type",
    "outputFile",
    "apiVersion",
    "progress",
    "beautify"
];

exports.createCommand = function (program) {
    program
        .command('metadata:local:describe')
        .description('Command for describe all or specific Metadata Types like Custom Objects, Custom Fields, Apex Classes... that you have in your local project.')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-a, --all', 'Describe all metadata types stored in your local project')
        .option('-t, --type <MetadataTypeNames>', 'Describe the specified metadata types. You can select a single metadata or a list separated by commas. This option does not take effect if you choose describe all')
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
            Output.Printer.printError(new ErrorBuilder(ErrorCodes.FILE_ERROR).message('Wrong --output-file path').exception(error));
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
    describeLocalMetadata(args).then(function (result) {
        if (args.outputFile) {
            let baseDir = PathUtils.getDirname(args.outputFile);
            if (!FileChecker.isExists(baseDir))
                FileWriter.createFolderSync(baseDir);
            FileWriter.createFileSync(args.outputFile, JSON.stringify(result, null, 2));
            Output.Printer.printSuccess(new ResponseBuilder('Output saved in: ' + args.outputFile));
        } else {
            Output.Printer.printSuccess(new ResponseBuilder("Describe Metadata Types finished successfully").data(result));
        }
    }).catch(function (error) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.COMMAND_ERROR).exception(error));
    });
}

function describeLocalMetadata(args) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.progress)
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Getting All Available Metadata Types'));
            const username = ProjectUtils.getOrgAlias(args.root);
            const connection = new Connection(username, args.apiVersion, args.root);
            const metadataDetails = await connection.listMetadataTypes();
            const folderMetadataMap = TypesFactory.createFolderMetadataMap(metadataDetails);
            if (args.progress)
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Describing Local Metadata Types'));
            const metadataFromFileSystem = TypesFactory.createMetadataTypesFromFileSystem(folderMetadataMap, args.root);
            let metadata = {};
            if (args.all) {
                metadata = metadataFromFileSystem;
            } else if (args.type) {
                const types = MetadataCommandUtils.getTypes(args.type);
                for (const type of types) {
                    if (metadataFromFileSystem[type])
                        metadata[type] = metadataFromFileSystem[type];
                }
            }
            resolve(metadata);
        } catch (error) {
            reject(error);
        }
    });
}