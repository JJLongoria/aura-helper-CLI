const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const Config = require('../../main/config');
const Utils = require('./utils');
const CommandUtils = require('../utils');
const { PathUtils, FileChecker, FileWriter } = require('@ah/core').FileSystem;
const DependenciesManager = require('@ah/dependencies-manager');
const XMLCompressor = require('@ah/xml-compressor');
const Connection = require('@ah/connector');

const IGNORE_FILE_NAME = '.ahignore.json';

let argsList = [
    "root",
    "all",
    "type",
    "onlyCheck",
    "compress",
    "outputFile",
    "useIgnore",
    "ignoreFile",
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
        .command('metadata:local:repair')
        .description('Repair local project such as dependencies on files and metadata types.')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-a, --all', 'Repair all supported metadata types. ' + DependenciesManager.getSupportedTypes().join(', '))
        .option('-t, --type <MetadataTypeNames>', 'Repair specified metadata types. You can choose single type or a list separated by commas,  also you can choose to repair a specified objects like "MetadataTypeAPIName:MetadataObjectAPIName". For example, "CustomApplication:AppName1" for repair only AppName1 Custom App. This option does not take effet if select repair all')
        .option('-o, --only-check', 'If you select this options, the command not repair dependencies, instead return the errors on the files for repair manually', false)
        .option('-c, --compress', 'Add this option for compress modifieds files for repair operation.', false)
        .option('-s, --sort-order <sortOrder>', 'Sort order for the XML elements when compress XML files. By default, the elements are sorted with simple XML elements first. Values: ' + sortOrderValues.join(','), XMLCompressor.SORT_ORDER.SIMPLE_FIRST)
        .option('-u, --use-ignore', 'Option for ignore the metadata included in ignore file from the repair command')
        .option('-i, --ignore-file <path/to/ignore/file>', 'Path to the ignore file. Use this if you not want to use the project root ignore file or have different name. By default use ' + IGNORE_FILE_NAME + '  file from your project root', './' + IGNORE_FILE_NAME)
        .option('--output-file <path/to/output/file>', 'If you choose --only-check, you can redirect the output to a file')
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
    try {
        args.root = PathUtils.getAbsolutePath(args.root);
    } catch (error) {
        Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --root path. Select a valid path'));
        return;
    }
    if (args.all == undefined && args.type === undefined) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "You must select repair all or repair specific types"));
        return;
    }
    if (!FileChecker.isSFDXRootPath(args.root)) {
        Output.Printer.printError(Response.error(ErrorCodes.PROJECT_NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND.message + args.root));
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
    if (args.useIgnore && !FileChecker.isExists(args.ignoreFile)) {
        Output.Printer.printWarning('WARNING. --use-ignore option selected but not exists the ignore file in (' + args.ignoreFile + '). The selected files will be created but metadata not will be ignored');
    }
    let types;
    if (args.type) {
        types = Utils.getAdvanceTypes(args.type);
    }
    if (args.onlyCheck && args.outputFile) {
        try {
            args.outputFile = PathUtils.getAbsolutePath(args.outputFile);
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --output-file path. Select a valid path'));
            return;
        }
    }
    repairDependencies(args, types).then(function (result) {
        if (args.onlyCheck) {
            if (args.outputFile) {
                let baseDir = PathUtils.getDirname(args.outputFile);
                if (!FileChecker.isExists(baseDir))
                    FileWriter.createFolderSync(baseDir);
                FileWriter.createFileSync(args.outputFile, JSON.stringify(result, null, 2));
                Output.Printer.printSuccess(Response.success("Output saved in: " + args.outputFile));
            } else {
                Output.Printer.printSuccess(Response.success("The next metadata types has dependencies errors", result));
            }
        } else {
            Output.Printer.printSuccess(Response.success("Repair metadata finished successfully"));
        }
    }).catch(function (error) {
        Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
    });
}

function repairDependencies(args, types) {
    return new Promise(async function (resolve, reject) {
        try {
            const username = await Config.getAuthUsername(args.root);
            const connection = new Connection(username, undefined, args.root);
            const metadataDetails = await connection.listMetadataTypes();
            const result = DependenciesManager.repairDependencies(args.root, metadataDetails, {
                typesToRepair: types,
                compress: args.compress,
                sortOrder: args.sortOrder,
                checkOnly: args.checkOnly,
                ignoreFile: (args.useIgnore) ? args.ignoreFile : undefined,
            }, (status) => {
                if (status.stage === 'startObject') {
                    if (args.progress) {
                        Output.Printer.printProgress(Response.progress(undefined, 'Processing object ' + status.metadataObject + ' from ' + status.metadataType, args.progress));
                    }
                } else if (status.stage === 'startItem') {
                    if (args.progress) {
                        Output.Printer.printProgress(Response.progress(undefined, 'Processing item ' + status.metadataItem + '(' + status.metadataObject + ') from ' + status.metadataType, args.progress));
                    }
                }
            });
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
}