import { CoreUtils, FileChecker, XMLCompressorStatus } from "@aurahelper/core";
import { CommandUtils } from '../utils';
import { Printer } from '../../output';
import { ErrorBuilder, ProgressBuilder, ResponseBuilder } from '../response';
import { Errors } from '../errors';
import { XMLCompressor } from '@aurahelper/xml-compressor';
import { MTCommandUtils } from './utils';
const MathUtils = CoreUtils.MathUtils;
const Validator = CoreUtils.Validator;

const argsList: string[] = [
    "root",
    "all",
    "directory",
    "file",
    "progress",
    "beautify",
    "sorOrder",
];

const sortOrderValues = Object.values(XMLCompressor.getSortOrderValues());

export function createCommand(program: any) {
    program
        .command('metadata:local:compress')
        .description('Compress XML Metadata Files for best conflict handling with SVC systems. Works with relative or absolute paths.')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder.', './')
        .option('-s, --sort-order <sortOrder>', 'Sort order for the XML elements when compress XML files. By default, the elements are sorted with simple XML elements first. Values: ' + sortOrderValues.join(','), XMLCompressor.getSortOrderValues().SIMPLE_FIRST)
        .option('-a, --all', 'Compress all XML files with support compression in your project.')
        .option('-d, --directory <path/to/directory>', 'Compress XML Files from specific directory or directories separated by commas. This options does not take effect if you choose compress all.')
        .option('-f, --file <path/to/file>', 'Compress the specified XML file or files separated by commas. This options does not take effect if you choose compress directory or all.')
        .option('-p, --progress <format>', 'Option for report the command progress. Available formats: ' + CommandUtils.getProgressAvailableTypes().join(','))
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args: any) {
            run(args);
        });
}

function run(args: any) {
    Printer.setColorized(args.beautify);
    try {
        if (CommandUtils.hasEmptyArgs(args, argsList)) {
            Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS));
            return;
        }
        try {
            args.root = Validator.validateFolderPath(args.root);
        } catch (error) {
            Printer.printError(new ErrorBuilder(Errors.FOLDER_ERROR).message('Wrong --root path (' + args.root + ')').exception(error as Error));
            return;
        }
        if (!FileChecker.isSFDXRootPath(args.root)) {
            Printer.printError(new ErrorBuilder(Errors.PROJECT_NOT_FOUND).message(args.root));
            return;
        }
        if (args.progress) {
            if (!CommandUtils.getProgressAvailableTypes().includes(args.progress)) {
                Printer.printError(new ErrorBuilder(Errors.WRONG_ARGUMENTS).message('Wrong --progress value (' + args.progress + '). Please, select any of this vales: ' + CommandUtils.getProgressAvailableTypes().join(',')));
                return;
            }
        }
        if (args.all === undefined && args.directory === undefined && args.file === undefined) {
            Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message('You must select compress all, entire directory or single file'));
            return;
        }
        if (args.sortOrder) {
            if (!sortOrderValues.includes(args.sortOrder)) {
                Printer.printError(new ErrorBuilder(Errors.WRONG_ARGUMENTS).message('Wrong --sort-order value (' + args.sortOrder + '). Please, select any of this values: ' + sortOrderValues.join(',')));
                return;
            }
        }
        compress(args);
    } catch (error) {
        Printer.printError(new ErrorBuilder(Errors.COMMAND_ERROR).exception(error as Error));
    }
}

function compress(args: any) {
    const compressor = new XMLCompressor();
    compressor.setSortOrder(args.sortOrder);
    if (args.all || args.directory) {
        let param = (args.all) ? '--root' : '--directory';
        let path: string[] = [];
        try {
            path = (args.all) ? MTCommandUtils.getPaths(args.root, args.root, true) : MTCommandUtils.getPaths(args.directory, args.root, true);
            compressor.addPaths(path);
        } catch (error) {
            Printer.printError(new ErrorBuilder(Errors.FOLDER_ERROR).message('Wrong ' + param + ' path. Select a valid path').exception(error as Error));
            return;
        }
    } else {
        try {
            args.file = MTCommandUtils.getPaths(args.file, args.root);
        } catch (error) {
            Printer.printError(new ErrorBuilder(Errors.FILE_ERROR).message('Wrong --file path. Select a valid path').exception(error as Error));
            return;
        }
        compressor.addPaths(args.file);
    }
    compressor.onCompressFailed((status: XMLCompressorStatus) => {
        if (args.progress) {
            Printer.printProgress(new ProgressBuilder(args.progress).message('File ' + status.file + ' does not support XML compression').increment(MathUtils.round(100 / status.totalFiles, 2)).percentage(MathUtils.round((status.filesProcessed / status.totalFiles) * 100, 2)));
        }
    });
    compressor.onCompressSuccess((status) => {
        if (args.progress) {
            Printer.printProgress(new ProgressBuilder(args.progress).message('File ' + status.file + ' compressed succesfully').increment(MathUtils.round(100 / status.totalFiles, 2)).percentage(MathUtils.round((status.filesProcessed / status.totalFiles) * 100, 2)));
        }
    });
    compressor.compress().then(() => {
        Printer.printSuccess(new ResponseBuilder('Compress XML files finish successfully'));
    }).catch((error) => {
        Printer.printError(new ErrorBuilder(Errors.FILE_ERROR).exception(error));
    });
}

