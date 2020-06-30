const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const FileSystem = require('../../fileSystem');
const Config = require('../../main/config');
const StrUtils = require('../../utils/strUtils');
const CommandUtils = require('../utils');
const ProcessManager = require('../../processes').ProcessManager;
const Paths = FileSystem.Paths;
const FileChecker = FileSystem.FileChecker;

let argsList = [
    "root",
    "query",
    "prefix",
    "outputPath",
    "username",
    "progress",
    "beautify"
];

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
        args.root = Paths.getAbsolutePath(args.root);
    } catch (error) {
        Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --root path. Select a valid path'));
        return;
    }
    if (!args.outputPath) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --output-path. You must select an output dir for save the generated files"));
        return;
    } else {
        try {
            args.outputPath = Paths.getAbsolutePath(args.outputPath);
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --output-path path. Select a valid path'));
            return;
        }
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
        Output.Printer.printError(Response.error(ErrorCodes.DATA_ERROR, error));
    });
}

function startExtractingData(args) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.progress) {
                Output.Printer.printProgress(Response.progress(undefined, 'Start Extracting data from ' + ((args.username) ? 'Org with username or alias ' + args.username : 'Auth org'), args.progress));
                reportExtractingProgress(args, 1000);
            }
            let out = await ProcessManager.exportTreeData(args.query, args.prefix, args.outputPath, args.username);
            extractingFinished = true;
            if (out) {
                if (out.stdOut) {
                    resolve(processOut(out.stdOut));
                } else {
                    reject(out.stdErr);
                }
            } else {
                reject('Operation cancelled');
            }
        } catch (error) {
            reject(error);
        }
    });
}

function reportExtractingProgress(args, millis) {
    if (!extractingFinished) {
        setTimeout(function () {
            if (!extractingFinished) {
                Output.Printer.printProgress(Response.progress(undefined, '(' + new Date().getTime() + ') Extraction in progress. Please wait.', args.progress));
                reportExtractingProgress(args, millis);
            }
        }, millis);
    }
}

function processOut(out) {
    let outData = StrUtils.replace(out, '\n', '').split(',');
    let dataToReturn = [];
    for (let data of outData) {
        let splits = data.split(" ");
        let nRecords = splits[1];
        let file = Paths.getBasename(splits[splits.length - 1]);
        dataToReturn.push(
            {
                file: file,
                records: nRecords,
                isPlanFile: file.endsWith("-plan.json")
            }
        );
    }
    return dataToReturn;
}