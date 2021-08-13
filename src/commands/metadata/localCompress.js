const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const CommandUtils = require('../utils');
const MetadataCommandUtils = require('./utils');
const { PathUtils, FileChecker } = require('@ah/core').FileSystem;
const XMLCompressor = require('@ah/xml-compressor');
const { MathUtils } = require('@ah/core').CoreUtils;

let argsList = [
    "root",
    "all",
    "directory",
    "file",
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
        .command('metadata:local:compress')
        .description('Compress XML Metadata Files for best conflict handling with SVC systems. Works with relative or absolute paths.')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder.', './')
        .option('-s, --sort-order <sortOrder>', 'Sort order for the XML elements when compress XML files. By default, the elements are sorted with simple XML elements first. Values: ' + sortOrderValues.join(','), XMLCompressor.SORT_ORDER.SIMPLE_FIRST)
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
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS));
            return;
        }
        try {
            args.root = PathUtils.getAbsolutePath(args.root);
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --root path. Select a valid path'));
            return;
        }
        if (args.all == undefined && args.directory === undefined && args.file === undefined) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "You must select compress all, entire directory or single file"));
            return;
        }
        if (args.progress) {
            if (!CommandUtils.getProgressAvailableTypes().includes(args.progress)) {
                Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --progress value. Please, select any  of this vales: " + CommandUtils.getProgressAvailableTypes().join(',')));
                return;
            }
        }
        if (args.sortOrder) {
            if (!sortOrderValues.includes(args.sortOrder)) {
                Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --sort-order value. Please, select any  of this vales: " + sortOrderValues.join(',')));
                return;
            }
        }
        if (!FileChecker.isSFDXRootPath(args.root)) {
            Output.Printer.printError(Response.error(ErrorCodes.PROJECT_NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND.message + args.root));
            return;
        }
        compress(args);
    } catch (error) {
        Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
    }
}

function compress(args) {
    if (args.all || args.directory) {
        let param = (args.all) ? '--root' : '--directory';
        let path = (args.all) ? args.root : args.directory;
        try {
            path = PathUtils.getAbsolutePath(path);
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong ' + param + ' path. Select a valid path'));
            return;
        }
        XMLCompressor.compress(path, args.sortOrder, function (file, compressed, nFile, totalFiles) {
            if (compressed) {
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(MathUtils.round((nFile / totalFiles) * 100, 2), 'File ' + file + ' compressed succesfully', args.progress));
            } else {
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(MathUtils.round((nFile / totalFiles) * 100, 2), 'The  file ' + file + ' does not support XML compression', args.progress));
            }
        }).then(() => {
            Output.Printer.printSuccess(Response.success('Compress XML files finish successfully'));
        }).catch((error) => {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, error));
        });
    } else {
        try {
            args.file = MetadataCommandUtils.getPaths(args.file);
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --file path. Select a valid path'));
            return;
        }
        XMLCompressor.compress(args.file, args.sortOrder, function (file, compressed) {
            if (compressed) {
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(100, 'File ' + file + ' compressed succesfully', args.progress));
            } else {
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(100, 'The  file ' + file + ' does not support XML compression', args.progress));
            }
        }).then(() => {
            Output.Printer.printSuccess(Response.success('Compress XML files finish successfully'));
        }).catch((error) => {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, error));
        });
    }
}

