const Output = require('../../output');
const { ResponseBuilder, ProgressBuilder, ErrorBuilder } = require('../response');
const ErrorCodes = require('../errors');
const MetadataCommandUtils = require('./utils');
const CommandUtils = require('../utils');
const { PathUtils, FileChecker } = require('@ah/core').FileSystem;
const { ProjectUtils, Validator } = require('@ah/core').CoreUtils;
const XMLCompressor = require('@ah/xml-compressor');
const Connection = require('@ah/connector');
const Ignore = require('@ah/ignore');

const IGNORE_FILE_NAME = '.ahignore.json';

let argsList = [
    "root",
    "all",
    "type",
    "ignoreFile",
    "compress",
    "progress",
    "beautify",
    "sorOrder"
];

const sortOrderValues = Object.values(XMLCompressor.getSortOrderValues());

exports.createCommand = function (program) {
    program
        .command('metadata:local:ignore')
        .description('Command for ignore metadata from your project. Use .ahignore.json file for perform this operation. This command will be delete the ignored metadata from your project folder')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-a, --all', 'Ignore all metadata types according to the ignore file')
        .option('-t, --type <MetadataTypeNames>', 'Ignore the specified metadata types according to the ignore file. You can select a sigle or a list separated by commas. This options does not take effect if you choose ignore all')
        .option('-i, --ignore-file <path/to/ignore/file>', 'Path to the ignore file. Use this if you not want to use the project root ignore file or have different name. By default use ' + IGNORE_FILE_NAME + '  file from your project root', './' + IGNORE_FILE_NAME)
        .option('-c, --compress', 'Add this option for compress modified files for ignore operation.')
        .option('-s, --sort-order <sortOrder>', 'Sort order for the XML elements when compress XML files. By default, the elements are sorted with simple XML elements first. Values: ' + sortOrderValues.join(','), XMLCompressor.getSortOrderValues().SIMPLE_FIRST)
        .option('-p, --progress <format>', 'Option for report the command progress. Available formats: ' + CommandUtils.getProgressAvailableTypes().join(','))
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args) {
            run(args);
        });
}

function run(args) {
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
    if (args.all == undefined && args.type === undefined) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS).message("You must select ignore all or ignore specific types"));
        return;
    }
    if (!args.ignoreFile)
        args.ignoreFile = args.root + '/' + IGNORE_FILE_NAME;
    try {
        Validator.validateJSONFile(args.ignoreFile);
        args.ignoreFile = PathUtils.getAbsolutePath(args.ignoreFile);
    } catch (error) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.FILE_ERROR).message('Wrong --ignore-file path.').exception(error));
        return;
    }
    if (args.sortOrder) {
        if (!sortOrderValues.includes(args.sortOrder)) {
            Output.Printer.printError(new ErrorBuilder(ErrorCodes.WRONG_ARGUMENTS).message('Wrong --sort-order value (' + args.sortOrder + '). Please, select any of this values: ' + sortOrderValues.join(',')));
            return;
        }
    }
    let types;
    if (args.type) {
        types = MetadataCommandUtils.getTypes(args.type);
    }
    ignoreMetadata(args, types).then(function () {
        Output.Printer.printSuccess(new ResponseBuilder("Ignore metadata finished successfully"));
    }).catch(function (error) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.COMMAND_ERROR).exception(error));
    });
}

function ignoreMetadata(args, typesToIgnore) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.progress)
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Getting All Available Metadata Types'));
            const username = ProjectUtils.getOrgAlias(args.root);
            const connection = new Connection(username, undefined, args.root);
            const metadataDetails = await connection.listMetadataTypes();
            const ignore = new Ignore(args.ignoreFile);
            ignore.setCompress(args.compress).setSortOrder(args.sortOrder).setTypesToIgnore(typesToIgnore);
            ignore.onStartProcessType((metadataTypeName) => {
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Processing ' + metadataTypeName + ' Metadata Type'));
            });
            ignore.ignoreProjectMetadata(args.root, metadataDetails);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}