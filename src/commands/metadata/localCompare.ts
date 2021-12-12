import { MetadataFactory } from '@aurahelper/metadata-factory';
import { CoreUtils, PathUtils, FileChecker, FileWriter } from "@aurahelper/core";
import { SFConnector } from '@aurahelper/connector';
import { CommandUtils } from '../utils';
import { Printer } from '../../output';
import { ErrorBuilder, ProgressBuilder, ResponseBuilder } from '../response';
import { Errors } from '../errors';
const MetadataUtils = CoreUtils.MetadataUtils;
const ProjectUtils = CoreUtils.ProjectUtils;
const Validator = CoreUtils.Validator;

const argsList: string[] = [
    "root",
    "outputFile",
    "progress",
    "beautify"
];

export function createCommand(program: any) {
    program
        .command('metadata:local:compare')
        .description('Command to compare the organization\'s metadata with local metadata. Returns metadata that does not exist in auth org but exists in local.')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('--output-file <path/to/output/file>', 'Path to file for redirect the output')
        .option('-p, --progress <format>', 'Option for report the command progress. Available formats: ' + CommandUtils.getProgressAvailableTypes().join(','))
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args: any) {
            run(args);
        });
}

async function run(args: any) {
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
    if (args.outputFile) {
        try {
            args.outputFile = PathUtils.getAbsolutePath(args.outputFile);
        } catch (error) {
            Printer.printError(new ErrorBuilder(Errors.FILE_ERROR).message('Wrong --output-file path').exception(error as Error));
            return;
        }
    }

    compareMetadata(args).then(function (result) {
        if (args.outputFile) {
            let baseDir = PathUtils.getDirname(args.outputFile);
            if (!FileChecker.isExists(baseDir)) {
                FileWriter.createFolderSync(baseDir);
            }
            FileWriter.createFileSync(args.outputFile, JSON.stringify(result, null, 2));
            Printer.printSuccess(new ResponseBuilder('Output saved in ' + args.outputFile));
        } else {
            Printer.printSuccess(new ResponseBuilder('Comparing Local with Org finished succesfully').data(result));
        }
    }).catch(function (error) {
        Printer.printError(new ErrorBuilder(Errors.COMMAND_ERROR).exception(error));
    });
}

function compareMetadata(args: any) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.progress) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('Describe Local Metadata'));
            }
            const username = ProjectUtils.getOrgAlias(args.root);
            const connection = new SFConnector(username, undefined, args.root);
            connection.setMultiThread();
            const metadataDetails = await connection.listMetadataTypes();
            const folderMetadataMap = MetadataFactory.createFolderMetadataMap(metadataDetails);
            const typesFromLocal = MetadataFactory.createMetadataTypesFromFileSystem(folderMetadataMap, args.root);
            if (args.progress) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('Describe Org Metadata'));
            }
            connection.onAfterDownloadType((status) => {
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder(args.progress).message('MetadataType: ' + status.entityType).increment(status.increment).percentage(status.percentage));
                }
            });
            const typesFromOrg = await connection.describeMetadataTypes(metadataDetails, false);
            if (args.progress) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('Comparing Metadata Types'));
            }
            const compareResult = MetadataUtils.compareMetadata(typesFromOrg, typesFromLocal);
            resolve(compareResult);
        } catch (error) {
            reject(error);
        }
    });
}