import { CoreUtils, PathUtils, FileChecker, FileWriter, MetadataType } from "@aurahelper/core";
import { SFConnector } from '@aurahelper/connector';
import { CommandUtils } from '../utils';
import { Printer } from '../../output';
import { ErrorBuilder, ProgressBuilder, ResponseBuilder } from '../response';
import { Errors } from '../errors';
import { XMLCompressor } from '@aurahelper/xml-compressor';
import { DependenciesManager } from '@aurahelper/dependencies-manager';
import { MTCommandUtils } from './utils';
const ProjectUtils = CoreUtils.ProjectUtils;
const Validator = CoreUtils.Validator;

const IGNORE_FILE_NAME = '.ahignore.json';

const argsList: string[] = [
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

const sortOrderValues = Object.values(XMLCompressor.getSortOrderValues());

export function createCommand(program: any) {
    program
        .command('metadata:local:repair')
        .description('Repair local project such as dependencies on files and metadata types.')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-a, --all', 'Repair all supported metadata types. ' + DependenciesManager.getSupportedTypes().join(', '))
        .option('-t, --type <MetadataTypeNames>', 'Repair specified metadata types. You can choose single type or a list separated by commas,  also you can choose to repair a specified objects like "MetadataTypeAPIName:MetadataObjectAPIName". For example, "CustomApplication:AppName1" for repair only AppName1 Custom App. This option does not take effet if select repair all')
        .option('-o, --only-check', 'If you select this options, the command not repair dependencies, instead return the errors on the files for repair manually', false)
        .option('-c, --compress', 'Add this option for compress modifieds files for repair operation.', false)
        .option('-s, --sort-order <sortOrder>', 'Sort order for the XML elements when compress XML files. By default, the elements are sorted with simple XML elements first. Values: ' + sortOrderValues.join(','), XMLCompressor.getSortOrderValues().SIMPLE_FIRST)
        .option('-u, --use-ignore', 'Option for ignore the metadata included in ignore file from the repair command')
        .option('-i, --ignore-file <path/to/ignore/file>', 'Path to the ignore file. Use this if you not want to use the project root ignore file or have different name. By default use ' + IGNORE_FILE_NAME + '  file from your project root', './' + IGNORE_FILE_NAME)
        .option('--output-file <path/to/output/file>', 'Path to file for redirect the output')
        .option('-p, --progress <format>', 'Option for report the command progress. Available formats: ' + CommandUtils.getProgressAvailableTypes().join(','))
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args: any) {
            run(args);
        });
}

function run(args: any) {
    Printer.setColorized(args.beautify);
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
    if (args.all === undefined && args.type === undefined) {
        Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message('You must select repair all or repair specific types'));
        return;
    }
    if (args.sortOrder) {
        if (!sortOrderValues.includes(args.sortOrder)) {
            Printer.printError(new ErrorBuilder(Errors.WRONG_ARGUMENTS).message('Wrong --sort-order value (' + args.sortOrder + '). Please, select any of this values: ' + sortOrderValues.join(',')));
            return;
        }
    }
    if (args.useIgnore) {
        if (!args.ignoreFile) {
            args.ignoreFile = args.root + '/' + IGNORE_FILE_NAME;
        }
        try {
            Validator.validateJSONFile(args.ignoreFile);
            args.ignoreFile = PathUtils.getAbsolutePath(args.ignoreFile);
        } catch (error) {
            Printer.printError(new ErrorBuilder(Errors.FILE_ERROR).message('Wrong --ignore-file path.').exception(error as Error));
            return;
        }
    }
    let types: { [key: string]: MetadataType } | undefined;
    if (args.type && !args.all) {
        types = MTCommandUtils.getAdvanceTypes(args.type);
    }
    if (args.outputFile) {
        try {
            args.outputFile = PathUtils.getAbsolutePath(args.outputFile);
        } catch (error) {
            Printer.printError(new ErrorBuilder(Errors.FILE_ERROR).message('Wrong --output-file path').exception(error as Error));
            return;
        }
    }
    repairDependencies(args, types).then(function (result) {
        if (args.outputFile) {
            let baseDir = PathUtils.getDirname(args.outputFile);
            if (!FileChecker.isExists(baseDir)) {
                FileWriter.createFolderSync(baseDir);
            }
            FileWriter.createFileSync(args.outputFile, JSON.stringify(result, null, 2));
            Printer.printSuccess(new ResponseBuilder("Output saved in: " + args.outputFile));
        } else {
            if (args.onlyCheck) {
                Printer.printSuccess(new ResponseBuilder("The next metadata types has dependencies errors").data(result));
            } else {
                Printer.printSuccess(new ResponseBuilder("Repair metadata finished successfully").data(result));
            }
        }
    }).catch(function (error) {
        Printer.printError(new ErrorBuilder(Errors.COMMAND_ERROR).exception(error));
    });
}

function repairDependencies(args: any, types?: { [key: string]: MetadataType }) {
    return new Promise(async function (resolve, reject) {
        try {
            const username = ProjectUtils.getOrgAlias(args.root);
            const connection = new SFConnector(username, undefined, args.root);
            const metadataDetails = await connection.listMetadataTypes();
            const manager = new DependenciesManager(args.root, metadataDetails);
            manager.setTypesToRepair(types).setCompress(args.compress).setSortOrder(args.sortOrder).setIgnoreFile((args.useIgnore) ? args.ignoreFile : undefined);
            manager.onStartObject((status) => {
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder(args.progress).message('Processing object ' + status.entityObject + ' from ' + status.entityType));
                }
            });
            manager.onStartItem((status) => {
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder(args.progress).message('Processing item ' + status.entityItem + '(' + status.entityObject + ') from ' + status.entityType));
                }
            });
            let result;
            if (args.onlyCheck) {
                result = manager.checkErrors();
            } else {
                result = manager.repairDependencies();
            }
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
}