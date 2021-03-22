const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const Config = require('../../main/config');
const Utils = require('./utils');
const CommandUtils = require('../utils');
const { PathUtils, FileChecker } = require('@ah/core').FileSystem;
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

let sortOrderValues = [
    XMLCompressor.SORT_ORDER.SIMPLE_FIRST,
    XMLCompressor.SORT_ORDER.COMPLEX_FIRST,
    XMLCompressor.SORT_ORDER.ALPHABET_ASC,
    XMLCompressor.SORT_ORDER.ALPHABET_DESC,
]

exports.createCommand = function (program) {
    program
        .command('metadata:local:ignore')
        .description('Command for ignore metadata from your project. Use .ahignore.json file for perform this operation. This command will be delete the ignored metadata from your project folder')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-a, --all', 'Ignore all metadata types according to the ignore file')
        .option('-t, --type <MetadataTypeNames>', 'Ignore the specified metadata types according to the ignore file. You can select a sigle or a list separated by commas. This options does not take effect if you choose ignore all')
        .option('-i, --ignore-file <path/to/ignore/file>', 'Path to the ignore file. Use this if you not want to use the project root ignore file or have different name. By default use ' + IGNORE_FILE_NAME + '  file from your project root', './' + IGNORE_FILE_NAME)
        .option('-c, --compress', 'Add this option for compress modified files for ignore operation.')
        .option('-s, --sort-order <sortOrder>', 'Sort order for the XML elements when compress XML files. By default, the elements are sorted with simple XML elements first. Values: ' + sortOrderValues.join(','), XMLCompressor.SORT_ORDER.SIMPLE_FIRST)
        .option('-p, --progress <format>', 'Option for report the command progress. Available formats: ' + CommandUtils.getProgressAvailableTypes().join(','))
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args) {
            run(args);
        });
}

function run(args) {
    Output.Printer.setColorized(args.beautify);
    if (CommandUtils.hasEmptyArgs(args, argsList)) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS));
        return;
    }
    if (args.all == undefined && args.type === undefined) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "You must select ignore all or ignore specific types"));
        return;
    }
    try {
        args.root = PathUtils.getAbsolutePath(args.root);
    } catch (error) {
        Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --root path. Select a valid path'));
        return;
    }
    if (!args.ignoreFile)
        args.ignoreFile = args.root + '/' + IGNORE_FILE_NAME;
    else {
        try {
            args.ignoreFile = PathUtils.getAbsolutePath(args.ignoreFile);
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --ignore-file path. Select a valid path'));
            return;
        }
    }
    if (!FileChecker.isSFDXRootPath(args.root)) {
        Output.Printer.printError(Response.error(ErrorCodes.PROJECT_NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND + PathUtils.getAbsolutePath(pathToRoot)));
        return;
    }
    if (!FileChecker.isExists(args.ignoreFile)) {
        Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, args.ignoreFile + " file not found. Check if file exists or have access permission"));
        return;
    }
    if (args.all == undefined && args.type === undefined) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "You must select ignore all or repair specific types"));
        return;
    }
    if (args.sortOrder) {
        if (!sortOrderValues.includes(args.sortOrder)) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --sort-order value. Please, select any  of this vales: " + sortOrderValues.join(',')));
            return;
        }
    }
    if (args.progress) {
        if (!CommandUtils.getProgressAvailableTypes().includes(args.progress)) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --progress value. Please, select any  of this vales: " + CommandUtils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
    let types;
    if (args.type) {
        types = Utils.getTypes(args.type);
    }
    ignoreMetadata(args, types).then(function () {
        Output.Printer.printSuccess(Response.success("Ignore metadata finished successfully"));
    }).catch(function (error) {
        Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
    });
}

function ignoreMetadata(args, typesForIgnore) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Getting All Available Metadata Types', args.progress));
            const username = await Config.getAuthUsername(args.root);
            const connection = new Connection(username, undefined, args.root);
            const metadataDetails = await connection.listMetadataTypes();
            await Ignore.ignoreProjectMetadata(args.root, metadataDetails, args.ignoreFile, {
                compress: args.compress,
                sortOrder: args.sortOrder,
                typesForIgnore: typesForIgnore
            }, (status) => {
                if (status.stage === 'type') {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(undefined, 'Processing ' + status.metadataType + ' Metadata Type', args.progress));
                }
            });
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}