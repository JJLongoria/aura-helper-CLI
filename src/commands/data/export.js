const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const Config = require('../../main/config');
const { ProjectUtils } = require('@ah/core').Utils;
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
        args.apiVersion = CommandUtils.getApiVersion(args.apiVersion);
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
                args.username = await Config.getAuthUsername(args.root);
            if (args.progress) {
                Output.Printer.printProgress(Response.progress(undefined, 'Start Extracting data from ' + ((args.username) ? 'Org with username or alias ' + args.username : 'Auth org'), args.progress));
                reportExtractingProgress(args, 1000);
            }
            const connection = new Connection(args.username, args.apiVersion, args.root, undefined);
            const response = await connection.exportTreeData(args.query, args.prefix, args.outputPath);
            resolve(response);
        } catch (error) {
            extractingFinished = true;
            reject(error);
        }
    });
}
/*
function getBatchesToExport(args) {
    return new Promise(async (resolve) => {
        if (args.progress) {
            Output.Printer.printProgress(Response.progress(undefined, 'Preparing to avoid limits.', args.progress));
            Output.Printer.printProgress(Response.progress(undefined, 'Count Main Records.', args.progress));
        }
        let from = args.query.substring(args.query.toLowerCase().lastIndexOf(' from '));
        let countResult = await runQuery(args, 'select count(Id) ' + from);
        if (args.progress)
            Output.Printer.printProgress(Response.progress(undefined, 'Main Records to process: ' + countResult.records[0].expr0, args.progress));
        if (countResult.records[0].expr0 > LIMIT) {
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Getting Ids for prepare export batches. Please, wait.', args.progress));
            let queryResult = await runQuery(args, 'select Id ' + from);
            let recordIdsGroups = {};
            let counter = 0;
            let groupName = 'Batch_';
            for (let record of queryResult.records) {
                let groupId = groupName + counter;
                if (!recordIdsGroups[groupId]) {
                    recordIdsGroups[groupId] = {
                        groupId: groupId,
                        records: [],
                    };
                }
                if (recordIdsGroups[groupId].records.length < LIMIT)
                    recordIdsGroups[groupId].records.push("'" + record.Id + "'");
                else {
                    counter++;
                    recordIdsGroups[groupId].records.sort();
                    groupId = groupName + counter;
                    if (!recordIdsGroups[groupId]) {
                        recordIdsGroups[groupId] = {
                            groupId: groupId,
                            records: ["'" + record.Id + "'"],
                        };
                    }
                }
            }
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, counter + 1 + ' Batches created to export data', args.progress));
            resolve(recordIdsGroups);
        }
        resolve(undefined);
    });
}

function exportWithBatches(args, batchesToExport) {
    return new Promise(async (resolve, reject) => {
        try {
            if (args.progress) {
                Output.Printer.printProgress(Response.progress(undefined, 'Start Extracting data from  Org with username or alias ' + args.username, args.progress));
                reportExtractingProgress(args, 1000);
            }
            for (let batchId of Object.keys(batchesToExport)) {
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Running export batch ' + batchId, args.progress));
                let ids = batchesToExport[batchId].records;
                let query = args.query;
                let lastFromIndex = query.toLowerCase().lastIndexOf(' from ');
                let from = args.query.substring(lastFromIndex).trim();
                let splits = from.split(' ');
                let obj = splits[1];
                query = query.substring(0, lastFromIndex);
                query += ' from ' + obj + ' where id >= ' + ids[0] + ' and id <= ' + ids[ids.length - 1];
                console.log(query);
                let out = await ProcessManager.exportTreeData(query, args.prefix, args.outputPath, args.username);
                console.log(out);
                if (out) {
                    if (out.stdOut) {
                        resolve();
                    } else {
                        reject(out.stdErr);
                        break;
                    }
                } else {
                    reject('Unknow Error');
                    break;
                }
            }
            extractingFinished = true;
        } catch (error) {
            reject(error);
            return;
        }
    });
}*/

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