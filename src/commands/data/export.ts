import { CoreUtils, PathUtils, FileChecker } from "@aurahelper/core";
import { Connection } from '@aurahelper/connector';
import { CommandUtils } from "../utils";
import { Printer } from "../../output";
import { Errors } from "../errors";
import { ErrorBuilder, ProgressBuilder, ResponseBuilder } from "../response";
const ProjectUtils = CoreUtils.ProjectUtils;

const argsList: string[] = [
    "root",
    "query",
    "prefix",
    "outputPath",
    "username",
    "apiVersion",
    "progress",
    "beautify"
];

const LIMIT = 10000;
let extractingFinished = false;

export function createCommand(program: any) {
    program
        .command('data:export')
        .description('Command for export data from the selected org to work with data:import command.')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-q, --query <query>', 'Query for extract data. You can use a simple query (Select [fields] from [object] [where] ...) or a complex query (select [fields], [query], [query] from [object] [where] ...) for export data in tree format')
        .option('-u, --username <username/or/alias>', 'Username or Alias for extract the data from a diferent org than the auth org in the project')
        .option('-o, --output-path <path/to/output/dir>', 'Path for save the generated output files. By default save result on <actualDir>/export', './export')
        .option('-x, --prefix <prefixForCreatedFiles>', 'Prefix for add to the generated files')
        .option('-v, --api-version <apiVersion>', 'Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the sfdx-project.json file')
        .option('-p, --progress <format>', 'Option for report the command progress. Available formats: ' + CommandUtils.getProgressAvailableTypes().join(','))
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args: any) {
            run(args);
        });
}

function run(args: any): void {
    extractingFinished = false;
    Printer.setColorized(args.beautify);
    if (CommandUtils.hasEmptyArgs(args, argsList)) {
        Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS));
        return;
    }
    if (!args.query) {
        Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message("Wrong --query. Query are required"));
        return;
    }
    try {
        args.root = PathUtils.getAbsolutePath(args.root);
    } catch (error) {
        Printer.printError(new ErrorBuilder(Errors.FILE_ERROR).message('Wrong --root path (' + args.root + '). Select a valid path'));
        return;
    }
    if (!args.outputPath) {
        Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message("Wrong --output-path. You must select an output dir for save the generated files"));
        return;
    } else {
        try {
            args.outputPath = PathUtils.getAbsolutePath(args.outputPath);
        } catch (error) {
            Printer.printError(new ErrorBuilder(Errors.FILE_ERROR).message('Wrong --output-path path. Select a valid path'));
            return;
        }
    }
    if (args.apiVersion) {
        args.apiVersion = ProjectUtils.getApiAsString(args.apiVersion);
        if (!args.apiVersion) {
            Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message('Wrong --api-version selected. Please, select a positive integer or decimal number'));
            return;
        }
    } else {
        let projectConfig = ProjectUtils.getProjectConfig(args.root);
        if (projectConfig) {
            args.apiVersion = projectConfig.sourceApiVersion;
        }
    }
    if (args.progress) {
        if (!CommandUtils.getProgressAvailableTypes().includes(args.progress)) {
            Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message("Wrong --progress value (' + args.progress + '). Please, select any of this vales: " + CommandUtils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
    if (!FileChecker.isSFDXRootPath(args.root)) {
        Printer.printError(new ErrorBuilder(Errors.PROJECT_NOT_FOUND).message(Errors.PROJECT_NOT_FOUND.message + args.root));
        return;
    }
    startExtractingData(args).then(function (out) {
        Printer.printSuccess(new ResponseBuilder("Data extracted succesfully on " + args.outputPath).data(out));
    }).catch(function (error) {
        extractingFinished = true;
        Printer.printError(new ErrorBuilder(Errors.DATA_ERROR).exception(error));
    });
}

function startExtractingData(args: any) {
    return new Promise(async function (resolve, reject) {
        try {
            if (!args.username) {
                args.username = ProjectUtils.getOrgAlias(args.root);
            }
            if (args.progress) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('Start Extracting data from ' + ((args.username) ? 'Org with username or alias ' + args.username : 'Auth org')));
                reportExtractingProgress(args, 1000);
            }
            const connection = new Connection(args.username, args.apiVersion, args.root, undefined);
            const response = await connection.exportTreeData(args.query, args.outputPath, args.prefix);
            resolve(response);
        } catch (error) {
            extractingFinished = true;
            reject(error);
        }
    });
}

function reportExtractingProgress(args: any, millis: number) {
    if (!extractingFinished) {
        setTimeout(function () {
            if (!extractingFinished) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('(' + new Date().getTime() + ') Extraction in progress. Please wait.'));
                reportExtractingProgress(args, millis);
            }
        }, millis);
    }
}