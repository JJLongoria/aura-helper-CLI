const Output = require('../../output');
const { ResponseBuilder, ProgressBuilder, ErrorBuilder } = require('../response');
const ErrorCodes = require('../errors');
const CommandUtils = require('../utils');
const MetadataCommandUtils = require('./utils');
const { PathUtils, FileChecker } = require('@ah/core').FileSystem;
const XMLCompressor = require('@ah/xml-compressor');
const { MathUtils, Validator } = require('@ah/core').CoreUtils;

const argsList = [
    "root",
    "all",
    "directory",
    "file",
    "progress",
    "beautify",
    "sorOrder",
];

const sortOrderValues = Object.values(XMLCompressor.getSortOrderValues());

exports.createCommand = function (program) {
    program
        .command('metadata:local:compress')
        .description('Compress XML Metadata Files for best conflict handling with SVC systems. Works with relative or absolute paths.')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder.', './')
        .option('-s, --sort-order <sortOrder>', 'Sort order for the XML elements when compress XML files. By default, the elements are sorted with simple XML elements first. Values: ' + sortOrderValues.join(','), XMLCompressor.getSortOrderValues().SIMPLE_FIRST)
        .option('-a, --all', 'Compress all XML files with support compression in your project.')
        .option('-d, --directory <path/to/directory>', 'Compress XML Files from specific directory. This options does not take effect if you choose compress all.')
        .option('-f, --file <path/to/file>', 'Compress the specified XML file. This options does not take effect if you choose compress directory or all.')
        .option('-p, --progress <format>', 'Option for report the command progress. Available formats: ' + CommandUtils.getProgressAvailableTypes().join(','))
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args) {
            run(args);
        });
}

function run(args) {
    Output.Printer.setColorized(args.beautify);
    try {
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
        if (args.all == undefined && args.directory === undefined && args.file === undefined) {
            Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS).message('You must select compress all, entire directory or single file'));
            return;
        }
        if (args.sortOrder) {
            if (!sortOrderValues.includes(args.sortOrder)) {
                Output.Printer.printError(new ErrorBuilder(ErrorCodes.WRONG_ARGUMENTS).message('Wrong --sort-order value (' + args.sortOrder + '). Please, select any of this values: ' + sortOrderValues.join(',')));
                return;
            }
        }
        compress(args);
    } catch (error) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.COMMAND_ERROR).exception(error));
    }
}

function compress(args) {
    const compressor = new XMLCompressor();
    compressor.setSortOrder(args.sortOrder);
    if (args.all || args.directory) {
        let param = (args.all) ? '--root' : '--directory';
        let path = (args.all) ? args.root : args.directory;
        try {
            path = Validator.validateFolderPath(path);
        } catch (error) {
            Output.Printer.printError(new ErrorBuilder(ErrorCodes.FOLDER_ERROR).message('Wrong ' + param + ' path. Select a valid path').exception(error));
            return;
        }
        compressor.addPaths(path);
    } else {
        try {
            args.file = MetadataCommandUtils.getPaths(args.file);
        } catch (error) {
            Output.Printer.printError(new ErrorBuilder(ErrorCodes.FILE_ERROR).message('Wrong --file path. Select a valid path').exception(error));
            return;
        }
        compressor.addPaths(args.file);
    }
    compressor.onCompressFailed((status) => {
        if (args.progress)
            Output.Printer.printProgress(new ProgressBuilder(args.progress).message('File ' + status.file + ' does not support XML compression').increment(MathUtils.round(100 / status.totalFiles, 2)).percentage(MathUtils.round((status.processedFiles / status.totalFiles) * 100, 2)));
    });
    compressor.onCompressSuccess((status) => {
        if (args.progress)
            Output.Printer.printProgress(new ProgressBuilder(args.progress).message('File ' + status.file + ' compressed succesfully').increment(MathUtils.round(100 / status.totalFiles, 2)).percentage(MathUtils.round((status.processedFiles / status.totalFiles) * 100, 2)));
    });
    compressor.compress().then(() => {
        Output.Printer.printSuccess(new ResponseBuilder('Compress XML files finish successfully'));
    }).catch((error) => {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.FILE_ERROR).exception(error));
    });
}

