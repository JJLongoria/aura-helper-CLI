const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const Config = require('../../main/config');
const CommandUtils = require('../utils');
const GitManager = require('@ah/git-manager');
const Connection = require('@ah/connector');
const Ignore = require('@ah/ignore');
const PackageGenerator = require('@ah/package-generator');
const { ProjectUtils } = require('@ah/core').Utils;
const { PathUtils, FileChecker, FileReader } = require('@ah/core').FileSystem;
const { TypesFactory } = require('@ah/core').Types;

const DESTRUCT_BEFORE_FILENAME = 'destructiveChanges.xml';
const DESTRUCT_AFTER_FILENAME = 'destructiveChangesPost.xml';
const PACKAGE_FILENAME = 'package.xml';
const IGNORE_FILE_NAME = '.ahignore.json';

const createTypeAvailableValues = [
    "package",
    "destructive",
    "both"
];

const createFromAvailableValues = [
    "git",
    //"csv",
    "json",
    "package"
];

const deleteOrderAvailableValues = [
    "before",
    "after"
];

let argsList = [
    "root",
    "outputPath",
    "createType",
    "createFrom",
    "deleteOrder",
    "source",
    "target",
    "raw",
    "apiVersion",
    "useIgnore",
    "ignoreFile",
    "explicit",
    "progress",
    "beautify"
];

exports.createCommand = function (program) {
    program
        .command('metadata:local:package:create')
        .description('Command for create the package XML file and descrutiveChanges XML file. You can create the package from multiple sources (git or json file) or merge several package files into one file')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-o, --output-path <target/files/path>', 'Path for save the generated files. By default is your manifest folder', './manifest')
        .option('-c, --create-type <createType>', 'Option for select the generated type file. You can choose between package, destructive or both. Package by default', 'package')
        .option('-f, --create-from <createFrom>', 'Option for select the source for generate the package. You can choose between git, json or package')
        .option('-d, --delete-order <beforeOrAfter>', 'This option allow to the user for select the order for delete metadata. Available values are before or after (after by  default). If you select before, destructiveChanges will be deployed before the package, after option deploy destructive changes after the package file', 'after')
        .option('-s, --source <source>', 'Option for select a source for compare. If you select create-from git, available values are a branch name, tag name or commit reference (or use "this" for select the active branch). If you select create-from json, the value are the path to the file. If you select create-from package, the values are a comma-separated list of the package paths, the package.xml files will be merge on one package, and same with destructiveChanges.xml files')
        .option('-t, --target <target>', 'Option for select a target for compare. If you select create-from git, available values are a branch name, tag name or commit reference. This options is only available for create-from git')
        .option('-r, --raw', 'Option for return the data for crate the pacakge. With this options, the package and destructive files don\'t will be create, instead the output are the json file for create a package or use for another pourpose. This options only works for if you select --create-from git')
        .option('-v, --api-version <apiVersion>', 'Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the sfdx-project.json file')
        .option('-u, --use-ignore', 'Option for ignore the metadata included in ignore file from the package and destructive files')
        .option('-i, --ignore-file <path/to/ignore/file>', 'Path to the ignore file. Use this if you not want to use the project root ignore file or have different name. By default use ' + IGNORE_FILE_NAME + '  file from your project root', './' + IGNORE_FILE_NAME)
        .option('-e, --explicit', 'If you select explicit option, the package will contains all object names explicit on the file, in otherwise, the package generator will be use a wildcard (*) when is necessary (All Childs from a metadata type are selected for deploy). Explicit option are fully recomended for retrieve metadata. This option only works if you select --create-from json', false)
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
    try {
        args.outputPath = PathUtils.getAbsolutePath(args.outputPath);
    } catch (error) {
        Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --output-path path. Select a valid path'));
        return;
    }
    if (!createTypeAvailableValues.includes(args.createType)) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --create-type selected. Plase select one of this values: ' + createTypeAvailableValues.join(',')));
        return;
    }
    if (!createFromAvailableValues.includes(args.createFrom)) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --create-from selected. Plase select one of this values: ' + createFromAvailableValues.join(',')));
        return;
    }
    if (!deleteOrderAvailableValues.includes(args.deleteOrder)) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --delete-order selected. Plase select one of this values: ' + deleteOrderAvailableValues.join(',')));
        return;
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
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --progress value. Please, select any  of this vales: " + CommandUtils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
    switch (args.createFrom) {
        case 'git':
            if (args.source === undefined) {
                Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --source. For --create-from git you must select a branch, tag or commit at source'));
                return;
            }
            if (args.target === 'this') {
                Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --target. For --create-from git "this" value is only available for --source parameter'));
                return;
            }
            createFromGit(args).then(function (result) {
                if (args.raw) {
                    Output.Printer.printSuccess(Response.success('Metadata extrated successfully for create the package and destructive files', result));
                } else {
                    Output.Printer.printSuccess(Response.success(result));
                }
                return;
            }).catch(function (error) {
                Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
                return;
            });
            break;
        case 'csv':
            if (args.source === undefined) {
                Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --source. For --create-from csv you must select the path to the csv file'));
                return;
            }
            try {
                args.source = PathUtils.getAbsolutePath(args.source);
            } catch (error) {
                Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --source path. Select a valid path'));
                return;
            }
            createFromCSV(args).then(function (result) {
                Output.Printer.printSuccess(Response.success(result));
                return;
            }).catch(function (error) {
                Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
                return;
            });;
            break;
        case 'json':
            if (args.source === undefined) {
                Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --source. For --create-from json you must select the path to the json file'));
                return;
            }
            try {
                args.source = PathUtils.getAbsolutePath(args.source);
            } catch (error) {
                Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --source path. Select a valid path'));
                return;
            }
            createFromJSON(args).then(function (result) {
                Output.Printer.printSuccess(Response.success(result));
                return;
            }).catch(function (error) {
                Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
                return;
            });
            break;
        case 'package':
            if (args.source === undefined) {
                Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --source. For --create-from package you must select the path to the json file'));
                return;
            }
            let packageSources = [];
            if (args.source.indexOf(',') !== -1) {
                packageSources = args.source.split(',');
            } else if (args.source.indexOf(' ') !== -1) {
                packageSources = args.source.split(' ');
            }
            if (packageSources.length < 2) {
                Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --source. For --create-from package you must select at least two package file paths'));
                return;
            }
            let packages = [];
            for (const packageSource of packageSources) {
                try {
                    packages.push(PathUtils.getAbsolutePath(packageSource));
                } catch (error) {
                    Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --source path. Select a valid path for ' + packageSource));
                    return;
                }
            }
            createFromPackage(args, packages).then(function (result) {
                Output.Printer.printSuccess(Response.success(result));
                return;
            }).catch(function (error) {
                Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
                return;
            });
            break;
    }
}

function createFromGit(args) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.source === 'this') {
                args.source = args.target;
                args.target = undefined;
            }
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Running Git Diff', args.progress));
            const gitDiffs = await GitManager.getDiffs(args.root, args.source, args.target);
            //FileWriter.createFileSync('./diffsOut.txt', diffsOut.stdOut);
            //FileWriter.createFileSync('./gitDiffs.json', JSON.stringify(gitDiffs, null, 2));
            const username = await Config.getAuthUsername(args.root);
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Getting All Available Metadata Types', args.progress));
            const connection = new Connection(username, undefined, args.root);
            const metadataDetails = await connection.listMetadataTypes();
            const folderMetadataMap = TypesFactory.createFolderMetadataMap(metadataDetails);
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Analyzing Process Diffs for get Metadata changes', args.progress));
            const metadataFromGitDiffs = TypesFactory.createMetadataTypesFromGitDiffs(args.root, gitDiffs, folderMetadataMap);
            if (args.useIgnore) {
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Ignoring Metadata', args.progress));
                metadataFromGitDiffs.toDeploy = Ignore.ignoreMetadata(metadataFromGitDiffs.toDeploy, args.ignoreFile, undefined, false);
                metadataFromGitDiffs.toDelete = Ignore.ignoreMetadata(metadataFromGitDiffs.toDelete, args.ignoreFile, undefined, false);
            }
            if (args.raw) {
                resolve(metadataFromGitDiffs);
            } else if (args.createType === 'package') {
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Creating ' + PACKAGE_FILENAME, args.progress));
                const resultPath = PackageGenerator.createPackage(metadataFromGitDiffs.toDeploy, args.outputPath, {
                    apiVersion: args.apiVersion,
                    explicit: true,
                });
                resolve(PathUtils.getBasename(resultPath) + ' file created succesfully on ' + args.outputPath);
            } else if (args.createType === 'destructive') {
                let resultPath;
                if (args.deployOrder === 'before') {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(undefined, 'Creating ' + DESTRUCT_BEFORE_FILENAME, args.progress));
                    resultPath = PackageGenerator.createBeforeDeployDestructive(metadataFromGitDiffs.toDelete, args.outputPath, {
                        apiVersion: args.apiVersion,
                        explicit: true,
                    });
                } else {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(undefined, 'Creating ' + DESTRUCT_AFTER_FILENAME, args.progress));
                    resultPath = PackageGenerator.createAfterDeployDestructive(metadataFromGitDiffs.toDelete, args.outputPath, {
                        apiVersion: args.apiVersion,
                        explicit: true,
                    });
                }
                resolve(PathUtils.getBasename(resultPath) + ' file created succesfully on ' + args.outputPath);
            } else {
                let packageResult;
                let destructiveResult;
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Creating ' + PACKAGE_FILENAME, args.progress));
                packageResult = PackageGenerator.createPackage(metadataFromGitDiffs.toDeploy, args.outputPath, {
                    apiVersion: args.apiVersion,
                    explicit: true,
                });
                if (args.deployOrder === 'before') {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(undefined, 'Creating ' + DESTRUCT_BEFORE_FILENAME, args.progress));
                    destructiveResult = PackageGenerator.createBeforeDeployDestructive(metadataFromGitDiffs.toDelete, args.outputPath, {
                        apiVersion: args.apiVersion,
                        explicit: true,
                    });
                } else {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(undefined, 'Creating ' + DESTRUCT_AFTER_FILENAME, args.progress));
                    destructiveResult = PackageGenerator.createAfterDeployDestructive(metadataFromGitDiffs.toDelete, args.outputPath, {
                        apiVersion: args.apiVersion,
                        explicit: true,
                    });
                }
                resolve(PathUtils.getBasename(packageResult) + ' and ' + PathUtils.getBasename(destructiveResult) + ' files created succesfully on ' + args.outputPath);
            }
        } catch (error) {
            reject(error);
        }
    });
}

function createFromCSV(args) {
    return new Promise(function (resolve, reject) {

    });
}

function createFromJSON(args) {
    return new Promise(function (resolve, reject) {
        try {
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Reading ' + args.source + ' JSON File', args.progress));
            let metadataTypes = JSON.parse(FileReader.readFileSync(args.source));
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Validating JSON Format', args.progress));
            if (args.useIgnore) {
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Ignoring Metadata', args.progress));
                metadataTypes = Ignore.ignoreMetadata(metadataTypes, args.ignoreFile, undefined, false);
            }
            if (args.createType === 'package') {
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Creating ' + PACKAGE_FILENAME, args.progress));
                const packageResult = PackageGenerator.createPackage(metadataTypes, args.outputPath, {
                    apiVersion: args.apiVersion,
                    explicit: args.explicit,
                });
                resolve(PathUtils.getBasename(packageResult) + ' file created succesfully on ' + args.outputPath);
            } else if (args.createType === 'destructive') {
                let destructiveResult;
                if (args.deployOrder === 'before') {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(undefined, 'Creating ' + DESTRUCT_BEFORE_FILENAME, args.progress));
                    destructiveResult = PackageGenerator.createBeforeDeployDestructive(metadataTypes, args.outputPath, {
                        apiVersion: args.apiVersion,
                        explicit: args.explicit,
                    });
                } else {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(undefined, 'Creating ' + DESTRUCT_AFTER_FILENAME, args.progress));
                    destructiveResult = PackageGenerator.createAfterDeployDestructive(metadataTypes, args.outputPath, {
                        apiVersion: args.apiVersion,
                        explicit: args.explicit,
                    });
                }
                resolve(PathUtils.getBasename(destructiveResult) + ' file created succesfully on ' + args.outputPath);
            }
        } catch (error) {
            reject(error);
        }
    });
}

function createFromPackage(args, packages) {
    return new Promise(function (resolve, reject) {
        try {
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Processing selected files', args.progress));
            if (args.createType === 'package') {
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Merging Package Files', args.progress));
                const result = PackageGenerator.mergePackages(packages, args.outputPath, {
                    apiVersion: args.apiVersion,
                    mergeDestructives: false,
                    explicit: true,
                    ignoreFile: (args.useIgnore) ? args.ignoreFile : undefined,
                });
                resolve(PathUtils.getBasename(result.package) + ' file created succesfully on ' + args.outputPath);
            } else if (args.createType === 'destructive') {
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Merging Destructive Files', args.progress));
                const result = PackageGenerator.mergePackages(packages, args.outputPath, {
                    apiVersion: args.apiVersion,
                    mergeDestructives: false,
                    mergeDestructives: true,
                    beforeDeploy: args.deployOrder === 'before',
                    explicit: true,
                    ignoreFile: (args.useIgnore) ? args.ignoreFile : undefined,
                });
                const resultPath = (args.deployOrder === 'before') ? result.destructiveChanges : result.destructiveChangesPost;
                resolve(PathUtils.getBasename(resultPath) + ' file created succesfully on ' + args.outputPath);
            } else {
                if (args.progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Merging Package and Destructive Files', args.progress));
                const result = PackageGenerator.mergePackages(packages, args.outputPath, {
                    apiVersion: args.apiVersion,
                    mergeDestructives: true,
                    mergeDestructives: true,
                    beforeDeploy: args.deployOrder === 'before',
                    explicit: true,
                    ignoreFile: (args.useIgnore) ? args.ignoreFile : undefined,
                });
                const destructiveResult = (args.deployOrder === 'before') ? result.destructiveChanges : result.destructiveChangesPost;
                resolve(PathUtils.getBasename(result.package) + ' and ' + PathUtils.getBasename(destructiveResult) + ' files created succesfully on ' + args.outputPath);
            }
        } catch (error) {
            reject(error);
        }
    });
}