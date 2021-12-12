import { MetadataFactory } from '@aurahelper/metadata-factory';
import { CoreUtils, PathUtils, FileChecker, PackageGeneratorResult } from "@aurahelper/core";
import { SFConnector } from '@aurahelper/connector';
import { CommandUtils } from '../utils';
import { Printer } from '../../output';
import { ErrorBuilder, ProgressBuilder, ResponseBuilder } from '../response';
import { Errors } from '../errors';
import { Ignore } from '@aurahelper/ignore';
import { PackageGenerator } from '@aurahelper/package-generator';
import { GitManager } from '@aurahelper/git-manager';
const ProjectUtils = CoreUtils.ProjectUtils;
const Validator = CoreUtils.Validator;

const DESTRUCT_BEFORE_FILENAME = 'destructiveChanges.xml';
const DESTRUCT_AFTER_FILENAME = 'destructiveChangesPost.xml';
const PACKAGE_FILENAME = 'package.xml';
const IGNORE_FILE_NAME = '.ahignore.json';

const createTypeAvailableValues: string[] = [
    "package",
    "destructive",
    "both"
];

const createFromAvailableValues: string[] = [
    "git",
    //"csv",
    "json",
    "package"
];

const deleteOrderAvailableValues: string[] = [
    "before",
    "after"
];

const argsList: string[] = [
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

export function createCommand(program: any) {
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
    try {
        args.outputPath = PathUtils.getAbsolutePath(args.outputPath);
    } catch (error) {
        Printer.printError(new ErrorBuilder(Errors.FOLDER_ERROR).message('Wrong --output-path path').exception(error as Error));
        return;
    }
    if (!createTypeAvailableValues.includes(args.createType)) {
        Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message('Wrong --create-type selected. Plase select one of this values: ' + createTypeAvailableValues.join(',')));
        return;
    }
    if (!createFromAvailableValues.includes(args.createFrom)) {
        Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message('Wrong --create-from selected. Plase select one of this values: ' + createFromAvailableValues.join(',')));
        return;
    }
    if (!deleteOrderAvailableValues.includes(args.deleteOrder)) {
        Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message('Wrong --delete-order selected. Plase select one of this values: ' + deleteOrderAvailableValues.join(',')));
        return;
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
    if (args.apiVersion) {
        try {
            args.apiVersion = ProjectUtils.getApiAsString(args.apiVersion);
        } catch (error) {
            Printer.printError(new ErrorBuilder(Errors.WRONG_ARGUMENTS).message('Wrong --api-version selected').exception(error as Error));
        }
    } else {
        let projectConfig = ProjectUtils.getProjectConfig(args.root);
        if (projectConfig) {
            args.apiVersion = projectConfig.sourceApiVersion;
        }
    }
    switch (args.createFrom) {
        case 'git':
            if (args.source === undefined) {
                Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message('Wrong --source. For --create-from git you must select a branch, tag or commit at source'));
                return;
            }
            if (args.target === 'this') {
                Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message('Wrong --target. For --create-from git "this" value is only available for --source parameter'));
                return;
            }
            createFromGit(args).then((result) => {
                if (args.raw) {
                    Printer.printSuccess(new ResponseBuilder('Metadata extrated successfully for create the package and destructive files').data(result));
                } else {
                    Printer.printSuccess(new ResponseBuilder('File(s) created succesfully').data(result));
                }
                return;
            }).catch((error) => {
                Printer.printError(new ErrorBuilder(Errors.COMMAND_ERROR).exception(error));
                return;
            });
            break;
        case 'csv':
            if (args.source === undefined) {
                Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message('Wrong --source. For --create-from csv you must select the path to the csv file'));
                return;
            }
            try {
                args.source = PathUtils.getAbsolutePath(args.source);
            } catch (error) {
                Printer.printError(new ErrorBuilder(Errors.FILE_ERROR).message('Wrong --source path. Select a valid path'));
                return;
            }
            createFromCSV(args).then(function (result) {
                Printer.printSuccess(new ResponseBuilder('File created succesfully').data(result));
                return;
            }).catch(function (error) {
                Printer.printError(new ErrorBuilder(Errors.COMMAND_ERROR).exception(error));
                return;
            });;
            break;
        case 'json':
            if (args.source === undefined) {
                Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message('Wrong --source. For --create-from json you must select the path to the json file'));
                return;
            }
            try {
                Validator.validateMetadataJSON(args.source);
                args.source = PathUtils.getAbsolutePath(args.source);
            } catch (error) {
                Printer.printError(new ErrorBuilder(Errors.FILE_ERROR).message('Wrong --source path.').exception(error as Error));
                return;
            }
            createFromJSON(args).then(function (result) {
                Printer.printSuccess(new ResponseBuilder('File created succesfully').data(result));
                return;
            }).catch(function (error) {
                Printer.printError(new ErrorBuilder(Errors.COMMAND_ERROR).exception(error));
                return;
            });
            break;
        case 'package':
            if (args.source === undefined) {
                Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message('Wrong --source. For --create-from package you must select the path to the json file'));
                return;
            }
            let packageSources = [];
            if (args.source.indexOf(',') !== -1) {
                packageSources = args.source.split(',');
            } else if (args.source.indexOf(' ') !== -1) {
                packageSources = args.source.split(' ');
            }
            if (packageSources.length < 2) {
                Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message('Wrong --source. For --create-from package you must select at least two package file paths'));
                return;
            }
            let packages = [];
            for (const packageSource of packageSources) {
                try {
                    packages.push(Validator.validateFilePath(packageSource));
                } catch (error) {
                    Printer.printError(new ErrorBuilder(Errors.FILE_ERROR).message('Wrong --source path. Select a valid path for ' + packageSource).exception(error as Error));
                    return;
                }
            }
            createFromPackage(args, packages).then(function (result) {
                Printer.printSuccess(new ResponseBuilder('File(s) created succesfully').data(result));
                return;
            }).catch(function (error) {
                Printer.printError(new ErrorBuilder(Errors.COMMAND_ERROR).exception(error));
                return;
            });
            break;
    }
}

function createFromGit(args: any) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.source === 'this') {
                args.source = args.target;
                args.target = undefined;
            }
            if (args.progress) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('Running Git Diff'));
            }
            const gitDiffs = await new GitManager(args.root).getDiffs(args.source, args.target);
            //FileWriter.createFileSync('./diffsOut.txt', diffsOut.stdOut);
            //FileWriter.createFileSync('./gitDiffs.json', JSON.stringify(gitDiffs, null, 2));
            const username = ProjectUtils.getOrgAlias(args.root);
            if (args.progress) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('Describe Local Metadata Types'));
            }
            const connection = new SFConnector(username, undefined, args.root);
            const metadataDetails = await connection.listMetadataTypes();
            const folderMetadataMap = MetadataFactory.createFolderMetadataMap(metadataDetails);
            if (args.progress) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('Analyzing Process Diffs for get Metadata changes'));
            }
            const metadataFromGitDiffs = MetadataFactory.createMetadataTypesFromGitDiffs(args.root, gitDiffs, folderMetadataMap);
            if (args.useIgnore) {
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder(args.progress).message('Ignoring Metadata'));
                }
                const ignore = new Ignore(args.ignoreFile);
                if (metadataFromGitDiffs.toDeploy) {
                    metadataFromGitDiffs.toDeploy = ignore.ignoreMetadata(metadataFromGitDiffs.toDeploy);
                }
                if (metadataFromGitDiffs.toDelete) {
                    metadataFromGitDiffs.toDelete = ignore.ignoreMetadata(metadataFromGitDiffs.toDelete);
                }
            }
            let packageResult;
            let destructiveResult;
            if (args.raw) {
                resolve(metadataFromGitDiffs);
            } else if (args.createType === 'package') {
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder(args.progress).message('Creating ' + PACKAGE_FILENAME));
                }
                if (metadataFromGitDiffs.toDeploy) {
                    packageResult = new PackageGenerator(args.apiVersion).setExplicit().createPackage(metadataFromGitDiffs.toDeploy, args.outputPath);
                }
            } else if (args.createType === 'destructive') {
                if (args.deployOrder === 'before') {
                    if (args.progress) {
                        Printer.printProgress(new ProgressBuilder(args.progress).message('Creating ' + DESTRUCT_BEFORE_FILENAME));
                    }
                    if (metadataFromGitDiffs.toDelete) {
                        destructiveResult = new PackageGenerator(args.apiVersion).setExplicit().createBeforeDeployDestructive(metadataFromGitDiffs.toDelete, args.outputPath);
                    }
                } else {
                    if (args.progress) {
                        Printer.printProgress(new ProgressBuilder(args.progress).message('Creating ' + DESTRUCT_AFTER_FILENAME));
                    }
                    if (metadataFromGitDiffs.toDelete) {
                        destructiveResult = new PackageGenerator(args.apiVersion).setExplicit().createAfterDeployDestructive(metadataFromGitDiffs.toDelete, args.outputPath);
                    }
                }
            } else {
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder(args.progress).message('Creating ' + PACKAGE_FILENAME));
                }
                if (metadataFromGitDiffs.toDeploy) {
                    packageResult = new PackageGenerator(args.apiVersion).setExplicit().createPackage(metadataFromGitDiffs.toDeploy, args.outputPath);
                }
                if (args.deployOrder === 'before') {
                    if (args.progress) {
                        Printer.printProgress(new ProgressBuilder(args.progress).message('Creating ' + DESTRUCT_BEFORE_FILENAME));
                    }
                    if (metadataFromGitDiffs.toDelete) {
                        destructiveResult = new PackageGenerator(args.apiVersion).setExplicit().createBeforeDeployDestructive(metadataFromGitDiffs.toDelete, args.outputPath);
                    }
                } else {
                    if (args.progress) {
                        Printer.printProgress(new ProgressBuilder(args.progress).message('Creating ' + DESTRUCT_AFTER_FILENAME));
                    }
                    if (metadataFromGitDiffs.toDelete) {
                        destructiveResult = new PackageGenerator(args.apiVersion).setExplicit().createAfterDeployDestructive(metadataFromGitDiffs.toDelete, args.outputPath);
                    }
                }
            }
            const result = new PackageGeneratorResult();
            result.package = packageResult !== undefined ? packageResult : undefined;
            result.destructiveChanges = (args.deployOrder === 'before' && destructiveResult) ? destructiveResult : undefined;
            result.destructiveChangesPost = (args.deployOrder !== 'before' && destructiveResult) ? destructiveResult : undefined;
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
}

function createFromCSV(_args: any) {
    return new Promise(function (_resolve, _reject) {

    });
}

function createFromJSON(args: any) {
    return new Promise(function (resolve, reject) {
        try {
            if (args.progress) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('Reading ' + args.source + ' JSON File'));
            }
            let metadataTypes = MetadataFactory.deserializeMetadataTypes(Validator.validateMetadataJSON(args.source));
            if (args.useIgnore) {
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder(args.progress).message('Ignoring Metadata'));
                }
                metadataTypes = new Ignore(args.ignoreFile).ignoreMetadata(metadataTypes);
            }
            let destructiveResult;
            let packageResult;
            if (args.createType === 'package') {
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder(args.progress).message('Creating ' + PACKAGE_FILENAME));
                }
                packageResult = new PackageGenerator(args.apiVersion).setExplicit(args.explicit).createPackage(metadataTypes, args.outputPath);
            } else if (args.createType === 'destructive') {
                if (args.deployOrder === 'before') {
                    if (args.progress) {
                        Printer.printProgress(new ProgressBuilder(args.progress).message('Creating ' + DESTRUCT_BEFORE_FILENAME));
                    }
                    destructiveResult = new PackageGenerator(args.apiVersion).setExplicit(args.explicit).createBeforeDeployDestructive(metadataTypes, args.outputPath);
                } else {
                    if (args.progress) {
                        Printer.printProgress(new ProgressBuilder(args.progress).message('Creating ' + DESTRUCT_AFTER_FILENAME));
                    }
                    destructiveResult = new PackageGenerator(args.apiVersion).setExplicit(args.explicit).createAfterDeployDestructive(metadataTypes, args.outputPath);
                }
            }
            const result = new PackageGeneratorResult();
            result.package = packageResult !== undefined ? packageResult : undefined;
            result.destructiveChanges = (args.deployOrder === 'before' && destructiveResult) ? destructiveResult : undefined;
            result.destructiveChangesPost = (args.deployOrder !== 'before' && destructiveResult) ? destructiveResult : undefined;
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
}

function createFromPackage(args: any, packages: string[]) {
    return new Promise(function (resolve, reject) {
        try {
            if (args.progress) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('Processing selected files'));
            }
            let result;
            if (args.createType === 'package') {
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder(args.progress).message('Merging Package Files'));
                }
                result = new PackageGenerator(args.apiVersion).setExplicit().setMergePackagesFiles().setIgnoreFile((args.useIgnore) ? args.ignoreFile : undefined).mergePackages(packages, args.outputPath);
            } else if (args.createType === 'destructive') {
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder(args.progress).message('Merging Destructive Files'));
                }
                result = new PackageGenerator(args.apiVersion).setExplicit().setMergeDestructives().setBeforeDeploy(args.deployOrder === 'before').setIgnoreFile((args.useIgnore) ? args.ignoreFile : undefined).mergePackages(packages, args.outputPath);
            } else {
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder(args.progress).message('Merging Package and Destructive Files'));
                }
                result = new PackageGenerator(args.apiVersion).setExplicit().setMergePackagesFiles().setMergeDestructives().setBeforeDeploy(args.deployOrder === 'before').setIgnoreFile((args.useIgnore) ? args.ignoreFile : undefined).mergePackages(packages, args.outputPath);
            }
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
}