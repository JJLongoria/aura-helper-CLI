const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const { ProjectUtils } = require('@ah/core').CoreUtils;
const { PathUtils, FileChecker } = require('@ah/core').FileSystem;
const Connection = require('@ah/connector');
const CommandUtils = require('../utils');

let argsList = [
    "root",
    "query",
    "prefix",
    "outputPath",
    "username",
    "apiVersion",
    "progress",
    "beautify"
];

let LIMIT = 10000;
let extractingFinished = false;

exports.createCommand = function (program) {
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
        .action(function (args) {
            run(args);
        });
}

function run(args) {
    extractingFinished = false;
    Output.Printer.setColorized(args.beautify);
    if (CommandUtils.hasEmptyArgs(args, argsList)) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS));
        return;
    }
    if (!args.query) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --query. Query are required"));
        return;
    }
    try {
        args.root = PathUtils.getAbsolutePath(args.root);
    } catch (error) {
        Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --root path. Select a valid path'));
        return;
    }
    if (!args.outputPath) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --output-path. You must select an output dir for save the generated files"));
        return;
    } else {
        try {
            args.outputPath = PathUtils.getAbsolutePath(args.outputPath);
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --output-path path. Select a valid path'));
            return;
        }
    }
    if (args.apiVersion) {
        args.apiVersion = ProjectUtils.getApiAsString(args.apiVersion);
        if (!args.apiVersion) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --api-version selected. Please, select a positive integer or decimal number'));
            return;
        }
    } else {
        let projectConfig = ProjectUtils.getProjectConfig(args.root);
        args.apiVersion = projectConfig.sourceApiVersion;
    }
    if (args.progress) {
        if (!CommandUtils.getProgressAvailableTypes().includes(args.progress)) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --progress value. Please, select any of this vales: " + CommandUtils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
    if (!FileChecker.isSFDXRootPath(args.root)) {
        Output.Printer.printError(Response.error(ErrorCodes.PROJECT_NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND.message + args.root));
        return;
    }
    startExtractingData(args).then(function (out) {
        Output.Printer.printSuccess(Response.success("Data extracted succesfully on " + args.outputPath, out));
    }).catch(function (error) {
        extractingFinished = true;
        Output.Printer.printError(Response.error(ErrorCodes.DATA_ERROR, error));
    });
}

function startExtractingData(args) {
    return new Promise(async function (resolve, reject) {
        try {
            if (!args.username)
                args.username = ProjectUtils.getOrgAlias(args.root);
            if (args.progress) {
                Output.Printer.printProgress(Response.progress(undefined, undefined, 'Start Extracting data from ' + ((args.username) ? 'Org with username or alias ' + args.username : 'Auth org'), args.progress));
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

function reportExtractingProgress(args, millis) {
    if (!extractingFinished) {
        setTimeout(function () {
            if (!extractingFinished) {
                Output.Printer.printProgress(Response.progress(undefined, undefined, '(' + new Date().getTime() + ') Extraction in progress. Please wait.', args.progress));
                reportExtractingProgress(args, millis);
            }
        }, millis);
    }
}