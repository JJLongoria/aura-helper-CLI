import { Printer } from "../../output";
import { Errors } from "../errors";
import { ErrorBuilder, ProgressBuilder, ResponseBuilder } from "../response";
import { CommandUtils } from "../utils";
import { CoreUtils, PathUtils, FileChecker, FileWriter, FileReader } from "@aurahelper/core";
import { Connection } from "@aurahelper/connector";
const ProjectUtils = CoreUtils.ProjectUtils;
const MathUtils = CoreUtils.MathUtils;

let argsList: string[] = [
    "root",
    "file",
    "query",
    "recordsNumber",
    "sourceOrg",
    "apiVersion",
    "progress",
    "beautify"
];

let extractingFinished: boolean = false;
let deletingFinished: boolean = false;
let refsByObjectType: any = {};
let recordTypeByObject: any = {};
let objectsHierarchyByType: any = {};
let savedIdsByReference: any = {};
let totalBatches: number = 0;
let username: string | undefined;

exports.createCommand = function (program: any) {
    program
        .command('data:import')
        .description('Command for import the data extracted with data:export command into the selected org')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-f, --file <path/to/exported/file>', 'Path to the exported file with data:export command for import into the auth org')
        .option('-n, --records-number <recordsPerBatch>', 'Number of records to insert at one time. Limit are 200 records. (200 by default)', "200")
        .option('-s, --source-org <username/or/alias>', 'Username or Alias to the source org for import data from the org, not from a file')
        .option('-q, --query <query>', 'Query for extract data. You can use a simple query (Select [fields] from [object] [where] ...) or a complex query (select [fields], [query], [query] from [object] [where] ...) for export data in tree format')
        .option('-v, --api-version <apiVersion>', 'Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the sfdx-project.json file')
        .option('-p, --progress <format>', 'Option for report the command progress. Available formats: ' + CommandUtils.getProgressAvailableTypes().join(','))
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args: any) {
            run(args);
        });
}

async function run(args: any) {
    extractingFinished = false;
    Printer.setColorized(args.beautify);
    if (CommandUtils.hasEmptyArgs(args, argsList)) {
        Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS));
        return;
    }
    if (args.sourceOrg && !args.query) {
        Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message("Wrong --query. Query are required for extract data from --source-org"));
        return;
    }
    try {
        args.root = PathUtils.getAbsolutePath(args.root);
    } catch (error) {
        Printer.printError(new ErrorBuilder(Errors.FILE_ERROR).message('Wrong --root path (' + args.root + '). Select a valid path'));
        return;
    }
    if (args.recordsNumber) {
        try {
            let integerValue = parseInt(args.recordsNumber);
            if (integerValue < 1 || integerValue > 200) {
                Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message('Wrong --records-number selected. Please, select an integer number between 1 and 200'));
                return;
            }
        } catch (error) {
            Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message('Wrong --records-number selected. Please, select an integer number between 1 and 200'));
            return;
        }
    }
    if (!args.sourceOrg) {
        try {
            args.file = PathUtils.getAbsolutePath(args.file);
            if (!args.file.endsWith('-plan.json')) {
                Printer.printError(new ErrorBuilder(Errors.FILE_ERROR).message('Wrong --file path. Please, select a plan file (File ended with -plan.json)'));
                return;
            } else if (!FileChecker.isExists(args.file)) {
                Printer.printError(new ErrorBuilder(Errors.FILE_ERROR).message('Wrong --file path. The selected plan file not exists or do not has permissions to access.'));
                return;
            }
        } catch (error) {
            Printer.printError(new ErrorBuilder(Errors.FILE_ERROR).message('Wrong --file path. Select a valid path'));
            return;
        }
    } else {
        if (!args.query) {
            Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message('Wrong --query. If you select a source org, you must include a query for export data'));
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
        const projectConfig = ProjectUtils.getProjectConfig(args.root);
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
    username = ProjectUtils.getOrgAlias(args.root);
    cleanWorkspace(PathUtils.getAuraHelperCLITempFilesPath() + '/import-export');
    if (args.sourceOrg) {
        let planFile = await startExtractingData(args);
        args.file = planFile;
    }
    isCorrectPlan(args.file).then(function (planData) {
        startImportingData(args, planData).then((insertErrorsByBatch: any) => {
            if (Object.keys(insertErrorsByBatch).length > 0) {
                let folder = PathUtils.getDirname(args.file) + '/errors';
                if (FileChecker.isExists(folder)) {
                    FileWriter.delete(folder);
                }
                FileWriter.createFolderSync(folder);
                Object.keys(insertErrorsByBatch).forEach(function (batchName) {
                    FileWriter.createFileSync(folder + '/' + batchName + '_errors.json', JSON.stringify(insertErrorsByBatch[batchName], null, 2));
                });
                Printer.printSuccess(new ResponseBuilder("Data does not import because found errors. Go to " + folder + " for see the errors by batch"));
            }
            else
                Printer.printSuccess(new ResponseBuilder("Data imported succesfully into your Auth Org"));
        }).catch(function (error) {
            Printer.printError(new ErrorBuilder(Errors.DATA_ERROR).exception(error));
        });
    }).catch(function (result) {
        if (Array.isArray(result)) {
            Printer.printError(new ErrorBuilder(Errors.FILE_ERROR).message("The next files does not exists or do not has access permission: " + result.join(", ")));
        } else {
            Printer.printError(new ErrorBuilder(Errors.FILE_ERROR).message(result));
        }
    });

}

function startImportingData(args: any, planData: any) {
    return new Promise(async function (resolve, reject) {
        let tempFolder = PathUtils.getAuraHelperCLITempFilesPath() + '/import-export';
        try {
            let planFolder = PathUtils.getDirname(args.file);
            await loadStoredRecordTypes(args);
            createReferencesMap(args, planData, planFolder);
            resolveRecordTypeReferences(args, planData, planFolder);
            createRecordsHierarchy(args, planData, planFolder);
            createBatches(args, planData);
            let insertErrorsByBatch: any = await insertBatches(args, planData);
            if (Object.keys(insertErrorsByBatch).length > 0) {
                await cleanInsertedRecords(args, tempFolder);
            }
            resolve(insertErrorsByBatch);
            //cleanWorkspace(tempFolder);
        } catch (error) {
            reject(error)
        }
    });
}

function startExtractingData(args: any) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.progress) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('Start Extracting data from Org with username or alias ' + args.sourceOrg));
                reportExtractingProgress(args, 1000);
            }
            const connection = new Connection(args.sourceOrg, args.apiVersion, args.root, undefined);
            const response = await connection.exportTreeData(args.query, args.outputPath, args.prefix);
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

function formatBatchCounter(counter: number) {
    if (counter < 10) {
        return '0000' + counter;
    } else if (counter < 100) {
        return '000' + counter;
    } else if (counter < 1000) {
        return '00' + counter;
    } else if (counter < 10000) {
        return '0' + counter;
    } else {
        return counter;
    }
}

function cleanWorkspace(tempFolder: string) {
    if (FileChecker.isExists(tempFolder)) {
        FileWriter.delete(tempFolder);
    }
    FileWriter.createFolderSync(tempFolder);
}

function cleanInsertedRecords(args: any, tempFolder: string): Promise<void> {
    return new Promise<void>(async function (resolve, reject) {
        try {
            if (args.progress) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('Errors found on import, rolling back'));
            }
            let idsByType: any = {};
            Object.keys(savedIdsByReference).forEach(function (reference) {
                let refData = savedIdsByReference[reference];
                if (!idsByType[refData.sobject]) {
                    idsByType[refData.sobject] = [];
                }
                idsByType[refData.sobject].push(refData.id);
            });
            for (let sobject of Object.keys(idsByType)) {
                deletingFinished = false;
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder(args.progress).message('Rolling back ' + sobject + ' record(s)'));
                    reportDeletingProgress(args, 1000);
                }
                let csvContent = 'Id\n' + idsByType[sobject].join('\n');
                let csvFile = sobject + '_deleteFile.csv';
                FileWriter.createFileSync(tempFolder + '/' + csvFile, csvContent);
                const connection = new Connection(username, args.apiVersion, args.root, undefined);
                try {
                    const response = await connection.bulkDelete(csvFile, sobject);
                    if (args.progress)
                        Printer.printProgress(new ProgressBuilder(args.progress).message('Roll back on ' + sobject + ' record(s) finished succesfully'));
                } catch (error) {
                    deletingFinished = true;
                    reject(error);
                    return;
                }
                deletingFinished = true;
            }
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

function createReferencesMap(args: any, planData: any[], planFolder: string): void {
    if (args.progress) {
        Printer.printProgress(new ProgressBuilder(args.progress).message('Saving Reference Map'));
    }
    for (let plan of planData) {
        for (const file of plan.files) {
            let filePath = planFolder + "/" + file;
            let fileData = JSON.parse(FileReader.readFileSync(filePath));
            for (let record of fileData.records) {
                if (!refsByObjectType[plan.sobject]) {
                    refsByObjectType[plan.sobject] = {
                        plan: plan,
                        references: [],
                    };
                }
                refsByObjectType[plan.sobject].references.push('@' + record.attributes.referenceId);
            }
            //FileWriter.createFileSync(filePath.replace('.json', '') + "_referencestmp.json", JSON.stringify(refsByObjectType, null, 2));
        }
    }
}

function resolveRecordTypeReferences(args: any, planData: any[], planFolder: string): void {
    if (args.progress) {
        Printer.printProgress(new ProgressBuilder(args.progress).message('Resolving Record Types references'));
    }
    for (let plan of planData) {
        if (args.progress) {
            Printer.printProgress(new ProgressBuilder(args.progress).message('Resolving Record Type references on ' + plan.sobject + ' records'));
        }
        for (const file of plan.files) {
            let filePath = planFolder + "/" + file;
            let fileData = JSON.parse(FileReader.readFileSync(filePath));
            for (let record of fileData.records) {
                if (record.RecordType) {
                    if (!record.RecordType.DeveloperName) {
                        throw new Error("DeveloperName not found on RecordType data. Please, put Recordtype.DeveloperName into the query for correct mapping of record types");
                    }
                    if (recordTypeByObject[plan.sobject]) {
                        if (recordTypeByObject[plan.sobject].recordTypes[record.RecordType.DeveloperName]) {
                            record.RecordTypeId = recordTypeByObject[plan.sobject].recordTypes[record.RecordType.DeveloperName].Id;
                            delete record.RecordType;
                        } else {
                            throw new Error("The Record type " + record.RecordType.DeveloperName + " not found on target org. Please, create the record type and then, import the data");
                        }
                    } else {
                        throw new Error("Has no record types for " + plan.sobject + " on target org. Please, create record types and then, import the data");
                    }
                }
            }
            FileWriter.createFileSync(filePath, JSON.stringify(fileData, null, 2));
        }
    }
}

function createRecordsHierarchy(args: any, planData: any[], planFolder: string): void {
    if (args.progress) {
        Printer.printProgress(new ProgressBuilder(args.progress).message('Resolving Self references'));
    }
    for (let plan of planData) {
        for (const file of plan.files) {
            let filePath = planFolder + "/" + file;
            let fileData = JSON.parse(FileReader.readFileSync(filePath));
            for (let record of fileData.records) {
                let haveParentId = false;
                let haveMasterId = false;
                if (record.MasterRecordId) {
                    haveMasterId = true;
                    delete record.MasterRecordId;
                }
                Object.keys(record).forEach(function (field) {
                    if (field !== 'attributes') {
                        if (refsByObjectType[plan.sobject]) {
                            if (refsByObjectType[plan.sobject].references.includes(record[field])) {
                                haveParentId = true;
                            }
                        }
                    }
                });
                if (haveParentId) {
                    if (!objectsHierarchyByType[plan.sobject]) {
                        objectsHierarchyByType[plan.sobject] = {
                            masters: [],
                            childs: [],
                        };
                    }
                    objectsHierarchyByType[plan.sobject].childs.push(record);
                } else {
                    if (!objectsHierarchyByType[plan.sobject]) {
                        objectsHierarchyByType[plan.sobject] = {
                            masters: [],
                            childs: [],
                        };
                    }
                    objectsHierarchyByType[plan.sobject].masters.push(record);
                }
            }
            //FileWriter.createFileSync(filePath.replace('.json', '') + "_tmp.json", JSON.stringify(objectsHierarchyByType, null, 2));
        }
    }
}

function createBatches(args: any, planData: any[]): void {
    if (args.progress) {
        Printer.printProgress(new ProgressBuilder(args.progress).message('Creating Batches to insert data'));
    }
    let batchFolder = PathUtils.getAuraHelperCLITempFilesPath() + '/import-export';
    totalBatches = 0;
    let totalRecords = 0;
    for (let plan of planData) {
        if (objectsHierarchyByType[plan.sobject]) {
            let counter = 1;
            let batchFileName = plan.sobject + '_batch_' + formatBatchCounter(counter) + '.json';
            let mastersFolder = batchFolder + '/' + plan.sobject + '/masters';
            let childsFolder = batchFolder + '/' + plan.sobject + '/childs';
            let records = [];
            for (let record of objectsHierarchyByType[plan.sobject].masters) {
                totalRecords++;
                if (records.length < args.recordsNumber) {
                    records.push(record);
                } else {
                    totalBatches++;
                    if (!FileChecker.isExists(mastersFolder))
                        FileWriter.createFolderSync(mastersFolder);
                    FileWriter.createFileSync(mastersFolder + '/' + batchFileName, JSON.stringify({ records: records }, null, 2));
                    records = [];
                    counter++;
                    batchFileName = plan.sobject + '_batch_' + formatBatchCounter(counter) + '.json';
                    records.push(record);
                }
            }
            if (records.length > 0) {
                totalBatches++;
                if (!FileChecker.isExists(mastersFolder))
                    FileWriter.createFolderSync(mastersFolder);
                FileWriter.createFileSync(mastersFolder + '/' + batchFileName, JSON.stringify({ records: records }, null, 2));
                records = [];
                counter++;
                batchFileName = plan.sobject + '_batch_' + formatBatchCounter(counter) + '.json';
            }
            for (let record of objectsHierarchyByType[plan.sobject].childs) {
                totalRecords++;
                if (records.length < args.recordsNumber) {
                    records.push(record);
                } else {
                    totalBatches++;
                    if (!FileChecker.isExists(childsFolder))
                        FileWriter.createFolderSync(childsFolder);
                    FileWriter.createFileSync(childsFolder + '/' + batchFileName, JSON.stringify({ records: records }, null, 2));
                    records = [];
                    counter++;
                    batchFileName = plan.sobject + '_batch_' + formatBatchCounter(counter) + '.json';
                    records.push(record);
                }
            }
            if (records.length > 0) {
                totalBatches++;
                if (!FileChecker.isExists(childsFolder))
                    FileWriter.createFolderSync(childsFolder);
                FileWriter.createFileSync(childsFolder + '/' + batchFileName, JSON.stringify({ records: records }, null, 2));
                records = [];
                counter++;
                batchFileName = plan.sobject + '_batch_' + formatBatchCounter(counter) + '.json';
            }
        }
    }
    if (args.progress) {
        Printer.printProgress(new ProgressBuilder(args.progress).message('Batches to insert data created. Total Records: ' + totalRecords + ' ; Total Batches: ' + totalBatches));
    }
}

function insertBatches(args: any, planData: any[]): Promise<any> {
    return new Promise<void>(async function (resolve, reject) {
        try {
            if (args.progress)
                Printer.printProgress(new ProgressBuilder(args.progress).message('Start job to insert data. This operation can take several minutes. Please wait.'));
            let batchFolder = PathUtils.getAuraHelperCLITempFilesPath() + '/import-export';
            let increment = MathUtils.round(100 / totalBatches, 2);
            let percentage = 0;
            let insertErrosByBatch: any = {};
            const connection = new Connection(username, args.apiVersion, batchFolder, undefined);
            for (let plan of planData) {
                let mastersFolder = plan.sobject + '/masters';
                let childsFolder = plan.sobject + '/childs';
                resolveReferences(args, batchFolder + '/' + mastersFolder, batchFolder + '/' + childsFolder);
                if (FileChecker.isExists(batchFolder + '/' + mastersFolder)) {
                    let batchFiles = FileReader.readDirSync(batchFolder + '/' + mastersFolder);
                    if (batchFiles.length > 0) {
                        if (Object.keys(savedIdsByReference).length > 0) {
                            if (args.progress)
                                Printer.printProgress(new ProgressBuilder(args.progress).message('Performing insert operation on ' + plan.sobject + ' record(s)'));
                        }
                        for (let batchFile of batchFiles) {
                            percentage += increment;
                            let batchName = batchFile.replace('.json', '');
                            if (args.progress)
                                Printer.printProgress(new ProgressBuilder(args.progress).increment(increment).percentage(percentage).message('Running Batch ' + batchName));
                            try {
                                const response = await connection.importTreeData(mastersFolder + '/' + batchFile);
                                if (response.results) {
                                    for (let insertResult of response.results) {
                                        savedIdsByReference[insertResult.refId] = {
                                            id: insertResult.id,
                                            sobject: insertResult.sobject,
                                        };
                                    }
                                } else {
                                    insertErrosByBatch[batchName] = {
                                        name: batchName,
                                        file: batchFolder + '/' + mastersFolder + '/' + batchFile,
                                        errors: response.errors,
                                    };
                                }
                            } catch (error) {
                                reject(error);
                            }
                        }
                    }
                }
                if (FileChecker.isExists(batchFolder + '/' + childsFolder)) {
                    let batchFiles = FileReader.readDirSync(batchFolder + '/' + childsFolder);
                    if (batchFiles.length > 0) {
                        if (Object.keys(savedIdsByReference).length > 0) {
                            if (args.progress)
                                Printer.printProgress(new ProgressBuilder(args.progress).message('Performing insert operation on ' + plan.sobject + ' child record(s)'));
                        }
                        for (let batchFile of batchFiles) {
                            percentage += increment;
                            let batchName = batchFile.replace('.json', '');
                            if (args.progress)
                                Printer.printProgress(new ProgressBuilder(args.progress).increment(increment).percentage(percentage).message('Running Batch ' + batchName));
                            try {
                                const response = await connection.importTreeData(childsFolder + '/' + batchFile);
                                if (response.results) {
                                    for (let insertResult of response.results) {
                                        savedIdsByReference[insertResult.refId] = {
                                            id: insertResult.id,
                                            sobject: insertResult.sobject,
                                        };
                                    }
                                } else {
                                    insertErrosByBatch[batchName] = {
                                        name: batchName,
                                        file: batchFolder + '/' + childsFolder + '/' + batchFile,
                                        errors: response.errors,
                                    };
                                }
                            } catch (error) {
                                reject(error);
                            }
                        }
                    }
                }
            }
            resolve(insertErrosByBatch);
        } catch (error) {
            reject(error);
        }
    });
}

function resolveReferences(args: any, mastersFolder: string, childsFolder: string) {
    if (Object.keys(savedIdsByReference).length > 0) {
        if (args.progress)
            Printer.printProgress(new ProgressBuilder(args.progress).message('Resolving References.'));
        if (FileChecker.isExists(mastersFolder)) {
            let batchFiles = FileReader.readDirSync(mastersFolder);
            if (batchFiles.length > 0) {
                for (let batchFile of batchFiles) {
                    let records = JSON.parse(FileReader.readFileSync(mastersFolder + '/' + batchFile));
                    for (let record of records.records) {
                        Object.keys(record).forEach(function (field) {
                            if (savedIdsByReference[record[field]]) {
                                record[field] = savedIdsByReference[record[field]].id;
                            }
                        });
                    }
                    FileWriter.createFileSync(mastersFolder + '/' + batchFile, JSON.stringify(records, null, 2));
                }
            }
        }
        if (FileChecker.isExists(childsFolder)) {
            let batchFiles = FileReader.readDirSync(childsFolder);
            if (batchFiles.length > 0) {
                for (let batchFile of batchFiles) {
                    let records = JSON.parse(FileReader.readFileSync(childsFolder + '/' + batchFile));
                    for (let record of records.records) {
                        Object.keys(record).forEach(function (field) {
                            if (savedIdsByReference[record[field]]) {
                                record[field] = savedIdsByReference[record[field]].id;
                            }
                        });
                    }
                    FileWriter.createFileSync(childsFolder + '/' + batchFile, JSON.stringify(records, null, 2));
                }
            }
        }
    }
}

function isCorrectPlan(planFile: string) {
    return new Promise(function (resolve, reject) {
        try {
            let planData = JSON.parse(FileReader.readFileSync(planFile));
            let planFolder = PathUtils.getDirname(planFile);
            let notExistingFiles = getNotExistingFiles(planData, planFolder);
            if (notExistingFiles.length > 0)
                reject(notExistingFiles);
            else
                resolve(planData);
        } catch (error) {
            reject(error);
        }
    });
}

function loadStoredRecordTypes(args: any): Promise<void> {
    return new Promise<void>(async function (resolve, reject) {
        try {
            if (args.progress)
                Printer.printProgress(new ProgressBuilder(args.progress).message('Loading stored Record Types from target org'));
            const connection = new Connection(username, args.apiVersion, undefined, undefined);
            const records = await connection.query("Select Id, Name, DeveloperName, SobjectType from RecordType");
            for (let record of records) {
                if (!recordTypeByObject[record.SobjectType]) {
                    recordTypeByObject[record.SobjectType] = {
                        sObject: record.SobjectType,
                        recordTypes: {},
                    };
                }
                recordTypeByObject[record.SobjectType].recordTypes[record.DeveloperName] = record;
            }
            if (args.progress)
                Printer.printProgress(new ProgressBuilder(args.progress).message('Record Types Loaded Successfully'));
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

function getNotExistingFiles(planData: any, planFolder: string): string[] {
    let notExistingFiles: string[] = [];
    for (let plan of planData) {
        for (const file of plan.files) {
            let filePath = planFolder + "/" + file;
            if (!FileChecker.isExists(filePath)) {
                notExistingFiles.push(filePath);
            }
        }
    }
    return notExistingFiles;
}

function reportDeletingProgress(args: any, millis: number) {
    if (!deletingFinished) {
        setTimeout(function () {
            if (!deletingFinished) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('(' + new Date().getTime() + ') Roll back in progress. Please wait.'));
                reportDeletingProgress(args, millis);
            }
        }, millis);
    }
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

