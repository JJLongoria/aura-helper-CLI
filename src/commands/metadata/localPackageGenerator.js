const { ResponseBuilder, ProgressBuilder, ErrorBuilder } = require('../response');
const GitManager = require('@ah/git-manager');
const Connection = require('@ah/connector');
const Ignore = require('@ah/ignore');
const PackageGenerator = require('@ah/package-generator');
const { ProjectUtils, Validator } = require('@ah/core').CoreUtils;
const { PackageGeneratorResult } = require('@ah/core').Types;
const { PathUtils, FileChecker, FileReader } = require('@ah/core').FileSystem;
const TypesFactory = require('@ah/metadata-factory');
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS));
        args.root = Validator.validateFolderPath(args.root);
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.FOLDER_ERROR).message('Wrong --root path').exception(error));
    if (!FileChecker.isSFDXRootPath(args.root)) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.PROJECT_NOT_FOUND).message(args.root));
        return;
    }
    if (args.progress) {
        if (!CommandUtils.getProgressAvailableTypes().includes(args.progress)) {
            Output.Printer.printError(new ErrorBuilder(ErrorCodes.WRONG_ARGUMENTS).message('Wrong --progress value. Please, select any of this vales: ' + CommandUtils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
        args.outputPath = PathUtils.getAbsolutePath(args.outputPath);
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.FOLDER_ERROR).message('Wrong --output-path path').exception(error));
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS).message('Wrong --create-type selected. Plase select one of this values: ' + createTypeAvailableValues.join(',')));
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS).message('Wrong --create-from selected. Plase select one of this values: ' + createFromAvailableValues.join(',')));
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS).message('Wrong --delete-order selected. Plase select one of this values: ' + deleteOrderAvailableValues.join(',')));
    if (args.useIgnore) {
        if (!args.ignoreFile)
            args.ignoreFile = args.root + '/' + IGNORE_FILE_NAME;
            Validator.validateJSONFile(args.ignoreFile);
            args.ignoreFile = PathUtils.getAbsolutePath(args.ignoreFile);
            Output.Printer.printError(new ErrorBuilder(ErrorCodes.FILE_ERROR).message('Wrong --ignore-file path.').exception(error));
        try {
            args.apiVersion = ProjectUtils.getApiAsString(args.apiVersion);
        } catch (error) {
            Output.Printer.printError(new ErrorBuilder(ErrorCodes.WRONG_ARGUMENTS).message('Wrong --api-version selected').exception(error));
        let projectConfig = ProjectUtils.getProjectConfig(args.root);
                Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS).message('Wrong --source. For --create-from git you must select a branch, tag or commit at source'));
                Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS).message('Wrong --target. For --create-from git "this" value is only available for --source parameter'));
            createFromGit(args).then((result) => {
                    Output.Printer.printSuccess(new ResponseBuilder('Metadata extrated successfully for create the package and destructive files').data(result));
                    Output.Printer.printSuccess(new ResponseBuilder('File(s) created succesfully').data(result));
            }).catch((error) => {
                Output.Printer.printError(new ErrorBuilder(ErrorCodes.COMMAND_ERROR).exception(error));
                Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS).message('Wrong --source. For --create-from csv you must select the path to the csv file'));
                args.source = PathUtils.getAbsolutePath(args.source);
                Output.Printer.printError(new ErrorBuilder(ErrorCodes.FILE_ERROR).message('Wrong --source path. Select a valid path'));
                Output.Printer.printSuccess(new ResponseBuilder('File created succesfully').data(result));
                Output.Printer.printError(new ErrorBuilder(ErrorCodes.COMMAND_ERROR).exception(error));
                Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS).message('Wrong --source. For --create-from json you must select the path to the json file'));
                Validator.validateMetadataJSON(args.source);
                args.source = PathUtils.getAbsolutePath(args.source);
                Output.Printer.printError(new ErrorBuilder(ErrorCodes.FILE_ERROR).message('Wrong --source path.').exception(error));
                Output.Printer.printSuccess(new ResponseBuilder('File created succesfully').data(result));
                Output.Printer.printError(new ErrorBuilder(ErrorCodes.COMMAND_ERROR).exception(error));
                Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS).message('Wrong --source. For --create-from package you must select the path to the json file'));
                Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS).message('Wrong --source. For --create-from package you must select at least two package file paths'));
                    packages.push(Validator.validateFilePath(packageSource));
                    Output.Printer.printError(new ErrorBuilder(ErrorCodes.FILE_ERROR).message('Wrong --source path. Select a valid path for ' + packageSource).exception(error));
                Output.Printer.printSuccess(new ResponseBuilder('File(s) created succesfully').data(result));
                Output.Printer.printError(new ErrorBuilder(ErrorCodes.COMMAND_ERROR).exception(error));
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Running Git Diff'));
            const gitDiffs = await GitManager.getDiffs(args.root, args.source, args.target);
            //FileWriter.createFileSync('./diffsOut.txt', diffsOut.stdOut);
            //FileWriter.createFileSync('./gitDiffs.json', JSON.stringify(gitDiffs, null, 2));
            const username = ProjectUtils.getOrgAlias(args.root);
            if (args.progress)
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Getting All Available Metadata Types'));
            const connection = new Connection(username, undefined, args.root);
            const metadataDetails = await connection.listMetadataTypes();
            const folderMetadataMap = TypesFactory.createFolderMetadataMap(metadataDetails);
            if (args.progress)
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Analyzing Process Diffs for get Metadata changes'));
            const metadataFromGitDiffs = TypesFactory.createMetadataTypesFromGitDiffs(args.root, gitDiffs, folderMetadataMap);
            if (args.useIgnore) {
                    Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Ignoring Metadata'));
                metadataFromGitDiffs.toDeploy = Ignore.ignoreMetadata(metadataFromGitDiffs.toDeploy, args.ignoreFile, undefined, false);
                metadataFromGitDiffs.toDelete = Ignore.ignoreMetadata(metadataFromGitDiffs.toDelete, args.ignoreFile, undefined, false);
            }
            let packageResult;
            let destructiveResult;
            if (args.raw) {
                resolve(metadataFromGitDiffs);
            } else if (args.createType === 'package') {
                    Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Creating ' + PACKAGE_FILENAME));
                packageResult = PackageGenerator.createPackage(metadataFromGitDiffs.toDeploy, args.outputPath, {
                    apiVersion: args.apiVersion,
                    explicit: true,
                });
            } else if (args.createType === 'destructive') {
                if (args.deployOrder === 'before') {
                        Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Creating ' + DESTRUCT_BEFORE_FILENAME));
                    destructiveResult = PackageGenerator.createBeforeDeployDestructive(metadataFromGitDiffs.toDelete, args.outputPath, {
                        apiVersion: args.apiVersion,
                        explicit: true,
                    });
                        Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Creating ' + DESTRUCT_AFTER_FILENAME));
                    destructiveResult = PackageGenerator.createAfterDeployDestructive(metadataFromGitDiffs.toDelete, args.outputPath, {
                        apiVersion: args.apiVersion,
                        explicit: true,
                    });
                if (args.progress)
                    Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Creating ' + PACKAGE_FILENAME));
                packageResult = PackageGenerator.createPackage(metadataFromGitDiffs.toDeploy, args.outputPath, {
                    apiVersion: args.apiVersion,
                    explicit: true,
                });
                if (args.deployOrder === 'before') {
                    if (args.progress)
                        Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Creating ' + DESTRUCT_BEFORE_FILENAME));
                    destructiveResult = PackageGenerator.createBeforeDeployDestructive(metadataFromGitDiffs.toDelete, args.outputPath, {
                        apiVersion: args.apiVersion,
                        explicit: true,
                    });
                } else {
                    if (args.progress)
                        Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Creating ' + DESTRUCT_AFTER_FILENAME));
                    destructiveResult = PackageGenerator.createAfterDeployDestructive(metadataFromGitDiffs.toDelete, args.outputPath, {
                        apiVersion: args.apiVersion,
                        explicit: true,
                    });
                } 
            const result = new PackageGeneratorResult();
            result.package = packageResult !== undefined ? packageResult : undefined;
            result.destructiveChanges = (args.deployOrder === 'before' && destructiveResult) ? destructiveResult : undefined;
            result.destructiveChangesPost = (args.deployOrder !== 'before' && destructiveResult) ? destructiveResult : undefined;
            resolve(result);
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Reading ' + args.source + ' JSON File'));
                    Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Ignoring Metadata'));
                metadataTypes = Ignore.ignoreMetadata(metadataTypes, args.ignoreFile, undefined, false);
            let destructiveResult;
            let packageResult;
                    Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Creating ' + PACKAGE_FILENAME));
                packageResult = PackageGenerator.createPackage(metadataTypes, args.outputPath, {
                    apiVersion: args.apiVersion,
                    explicit: args.explicit,
                });
                    if (args.progress)
                        Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Creating ' + DESTRUCT_BEFORE_FILENAME));
                    destructiveResult = PackageGenerator.createBeforeDeployDestructive(metadataTypes, args.outputPath, {
                        apiVersion: args.apiVersion,
                        explicit: args.explicit,
                    });
                    if (args.progress)
                        Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Creating ' + DESTRUCT_AFTER_FILENAME));
                    destructiveResult = PackageGenerator.createAfterDeployDestructive(metadataTypes, args.outputPath, {
                        apiVersion: args.apiVersion,
                        explicit: args.explicit,
                    });
            const result = new PackageGeneratorResult();
            result.package = packageResult !== undefined ? packageResult : undefined;
            result.destructiveChanges = (args.deployOrder === 'before' && destructiveResult) ? destructiveResult : undefined;
            result.destructiveChangesPost = (args.deployOrder !== 'before' && destructiveResult) ? destructiveResult : undefined;
            resolve(result);
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Processing selected files'));
            let result;
                    Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Merging Package Files'));
                result = PackageGenerator.mergePackages(packages, args.outputPath, {
                    apiVersion: args.apiVersion,
                    mergeDestructives: false,
                    mergePackages: true,
                    explicit: true,
                    ignoreFile: (args.useIgnore) ? args.ignoreFile : undefined,
                });
                    Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Merging Destructive Files'));
                result = PackageGenerator.mergePackages(packages, args.outputPath, {
                    apiVersion: args.apiVersion,
                    mergePackages: false,
                    mergeDestructives: true,
                    beforeDeploy: args.deployOrder === 'before',
                    explicit: true,
                    ignoreFile: (args.useIgnore) ? args.ignoreFile : undefined,
                });
                    Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Merging Package and Destructive Files'));
                result = PackageGenerator.mergePackages(packages, args.outputPath, {
                    apiVersion: args.apiVersion,
                    mergeDestructives: true,
                    mergePackages: true,
                    beforeDeploy: args.deployOrder === 'before',
                    explicit: true,
                    ignoreFile: (args.useIgnore) ? args.ignoreFile : undefined,
                });
            resolve(result);