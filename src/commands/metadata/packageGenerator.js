const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const FileSystem = require('../../fileSystem');
const Process = require('../../processes');
const Config = require('../../main/config');
const Metadata = require('../../metadata');
const Paths = FileSystem.Paths;
const FileChecker = FileSystem.FileChecker;
const MetadataFactory = Metadata.Factory;
const FileWriter = FileSystem.FileWriter;
const FileReader = FileSystem.FileReader;
const MetadataConnection = Metadata.Connection;
const MetadataUtils = Metadata.Utils;
const ProcessManager = Process.ProcessManager;
const PackageGenerator = Metadata.PackageGenerator;

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


exports.createCommand = function (program) {
    program
        .command('metadata:local:package:create')
        .description('Command for create the package XML file and descrutiveChanges XML file. You can create the package from multiple sources (git or json file) or merge several package files into one file')
        .option('-r, --root <path/to/project/root>', 'Path to project root', './')
        .option('-o, --output-path <target/files/path>', 'Path for save the generated files. By default is your manifest folder', './manifest')
        .option('-c, --create-type <createType>', 'Option for select the generated type file. You can choose between package, destructive or both. Package by default', 'package')
        .option('-f, --create-from <createFrom>', 'Option for select the source for generate the package. You can choose between git, json or package')
        .option('-s, --source <source>', 'Option for select a source for compare. If you select create-from git, available values are a branch name, tag name or commit reference (or use this for select the active branch). If you select create-from json, the value are the path to the file. If you select create-from package, the values are a comma-separated list of the package paths, the package.xml files will be merge on one package, and same with destructiveChanges.xml files')
        .option('-t, --target <target>', 'Option for select a target for compare. If you select create-from git, available values are a branch name, tag name or commit reference (or use this for select the active branch). This options is only available for create-from git')
        .action(function (args) {
            run(args);
        });
}

function run(args) {
    if (hasEmptyArgs(args)) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS));
        return;
    }
    try {
        args.root = Paths.getAbsolutePath(args.root);
    } catch (error) {
        Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --root path. Select a valid path'));
        return;
    }
    try {
        args.outputPath = Paths.getAbsolutePath(args.outputPath);
    } catch (error) {
        Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --output-path path. Select a valid path'));
        return;
    }
    if (!createTypeAvailableValues.includes(args.createType)) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --create-type selected. Plase select package, destructive or both'));
        return;
    }
    if (!createFromAvailableValues.includes(args.createFrom)) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --create-from selected. Plase select git, csv, json or package'));
        return;
    }
    switch (args.createFrom) {
        case 'git':
            if (args.source === undefined) {
                Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --source. For --create-from git you must select a branch, tag or commit at source'));
                return;
            }
            if (args.target === undefined) {
                Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --target. For --create-from git you must select a branch, tag or commit at source'));
                return;
            }
            createFromGit(args).then(function(result){
                Output.Printer.printSuccess(Response.success(result));
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
                args.source = Paths.getAbsolutePath(args.source);
            } catch (error) {
                Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --source path. Select a valid path'));
                return;
            }
            createFromCSV(args).then(function(result){
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
                args.source = Paths.getAbsolutePath(args.source);
            } catch (error) {
                Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --source path. Select a valid path'));
                return;
            }
            createFromJSON(args).then(function(result){
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
            if (args.source.indexOf(' ') !== -1) {
                packageSources = args.source.split(' ');
            } else if (args.source.indexOf(',') !== -1) {
                packageSources = args.source.split(',');
            }
            if (packageSources.length < 2) {
                Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --source. For --create-from package you must select at least two package file paths'));
                return;
            }
            let packages = [];
            for (const packageSource of packageSources) {
                try {
                    packages.push(Paths.getAbsolutePath(packageSource));
                } catch (error) {
                    Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --source path. Select a valid path for ' + packageSource));
                    return;
                }
            }
            createFromPackage(args, packages).then(function(result){
                Output.Printer.printSuccess(Response.success(result));
                return;
            }).catch(function (error) {
                Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
                return;
            });
            break;
    }
}

function hasEmptyArgs(args) {
    return args.root === undefined && args.path === undefined && args.createType === undefined && args.createFrom === undefined && args.source === undefined && args.target === undefined && args.gitOption === undefined;
}

function createFromGit(args) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.source === 'this') {
                args.source = target;
                args.target = undefined;
            }
            let diffsOut = await ProcessManager.gitDiff(args.root, args.source, args.target);
            if (diffsOut.stdOut) {
                let projectConfig = Config.getProjectConfig(args.root);
                let gitDiffs = processDiffOut(diffsOut.stdOut);
                let username = await Config.getAuthUsername(args.root);
                let metadataTypes = await MetadataConnection.getMetadataTypesFromOrg(username, args.root, { forceDownload: true });
                let folderMetadataMap = MetadataFactory.createFolderMetadataMap(metadataTypes);
                let metadataFromGitDiffs = MetadataFactory.getMetadataFromGitDiffs(args.root, gitDiffs, folderMetadataMap);
                if (args.createType === 'package') {
                    let packageContent = PackageGenerator.createPackage(metadataFromGitDiffs.metadataForDeploy, projectConfig.sourceApiVersion, true);
                    let packagePath = args.outputPath + '/package.xml';
                    FileWriter.createFileSync(packagePath, packageContent);
                    resolve('package.xml file created succesfully on ' + args.outputPath);
                } else if (args.createType === 'destructive') {
                    let destructiveContent = PackageGenerator.createPackage(metadataFromGitDiffs.metadataForDelete, projectConfig.sourceApiVersion, true);
                    let destructivePath = args.outputPath + '/destructiveChanges.xml';
                    FileWriter.createFileSync(destructivePath, destructiveContent);
                    resolve('destructiveChanges.xml file created succesfully on ' + args.outputPath);
                } else {
                    let packageContent = PackageGenerator.createPackage(metadataFromGitDiffs.metadataForDeploy, projectConfig.sourceApiVersion, true);
                    let destructiveContent = PackageGenerator.createPackage(metadataFromGitDiffs.metadataForDelete, projectConfig.sourceApiVersion, true);
                    let packagePath = args.outputPath + '/package.xml';
                    let destructivePath = args.outputPath + '/destructiveChanges.xml';
                    FileWriter.createFileSync(packagePath, packageContent);
                    FileWriter.createFileSync(destructivePath, destructiveContent);
                    resolve('package.xml and destructiveChanges.xml files created succesfully on ' + args.outputPath);
                }
            } else {
                reject(diffsOut.stdErr);
            }
        } catch (error) {
            reject(error);
        }
    });
}

function processDiffOut(stdOut) {
    let lines = stdOut.split('\n');
    let diffs = [];
    let diff;
    let startChanges = false;
    for (const diffLine of lines) {
        let words = diffLine.split(' ');
        if (diffLine.startsWith('diff --git')) {
            startChanges = false;
            if (diff && diff.path.indexOf('force-app') !== -1)
                diffs.push(diff);
            diff = {
                path: words[2].substring(2),
                mode: 'edit file',
                removeChanges: [],
                addChanges: []
            };
        } else if (diffLine.startsWith('new file mode')) {
            diff.mode = 'new file';
        } else if (diffLine.startsWith('deleted file mode')) {
            diff.mode = 'deleted file';
        } else if (!startChanges && diffLine.startsWith('+++')) {
            startChanges = true;
        } else if (startChanges) {
            if (diffLine.startsWith('-'))
                diff.removeChanges.push(diffLine.substring(1));
            else if (diffLine.startsWith('+'))
                diff.addChanges.push(diffLine.substring(1));
        }
    }
    if (diff && diff.path.indexOf('force-app') !== -1)
        diffs.push(diff);
    return diffs;
}

function createFromCSV(args) {
    return new Promise(function(resolve, reject){
        
    });
}

function createFromJSON(args) {
    return new Promise(function(resolve, reject){
        try{
            let metadataTypes = JSON.parse(FileReader.readFileSync(args.source));
            PackageGenerator.validateJSON(metadataTypes);
            if (args.createType === 'package') {
                let packageContent = PackageGenerator.createPackage(metadataTypes, projectConfig.sourceApiVersion, true);
                FileWriter.createFileSync(packagePath, packageContent);
                resolve('package.xml file created succesfully on ' + args.outputPath);
            } else if (args.createType === 'destructive') {
                let destructiveContent = PackageGenerator.createPackage(metadataTypes, projectConfig.sourceApiVersion, true);
                FileWriter.createFileSync(packagePath, destructiveContent);
                resolve('destructiveChanges.xml file created succesfully on ' + args.outputPath);
            }
        } catch(error){
            reject(error);
        }
    });
}

function createFromPackage(args, packages) {
    return new Promise(function (resolve, reject) {
        try {
            let pkgs = [];
            let destrucPkgs = [];
            for (const file of packages) {
                if (file.endsWith('package.xml')) {
                    pkgs.push(file);
                } else if (file.endsWith('destructiveChanges.xml')) {
                    destrucPkgs.push(file);
                }
            }
            if (args.createType === 'package') {
                let packageContent = PackageGenerator.mergePackages(pkgs);
                FileWriter.createFileSync(packagePath, packageContent);
                resolve('package.xml file created succesfully on ' + args.outputPath);
            } else if (args.createType === 'destructive') {
                let destructiveContent = PackageGenerator.mergePackages(destrucPkgs);
                FileWriter.createFileSync(packagePath, destructiveContent);
                resolve('destructiveChanges.xml file created succesfully on ' + args.outputPath);
            } else {
                let packageContent = PackageGenerator.mergePackages(pkgs);
                let destructiveContent = PackageGenerator.mergePackages(destrucPkgs);
                let packagePath = args.outputPath + '/package.xml';
                let destructivePath = args.outputPath + '/destructiveChanges.xml';
                FileWriter.createFileSync(packagePath, packageContent);
                FileWriter.createFileSync(destructivePath, destructiveContent);
                resolve('package.xml and destructiveChanges.xml files created succesfully on ' + args.outputPath);
            }
        } catch (error) {
            reject(error);
        }
    });
}