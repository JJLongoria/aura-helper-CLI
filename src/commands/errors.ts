export const Error: { [key: string]: any } = {
    MISSING_ARGUMENTS: {
        code: 'MISSING_ARGUMENTS_ERROR',
        message: "Wrong Command. Missing Arguments"
    },
    WRONG_ARGUMENTS: {
        code: 'WRONG_ARGUMENTS_ERROR',
        message: ""
    },
    PROJECT_NOT_FOUND: {
        code: 'PROJECT_NOT_FOUND_ERROR',
        message: "Error. Not root folder, sfdx-project.json file not found on "
    },
    FILE_ERROR: {
        code: 'FILE_ERROR',
        message: ""
    },
    FOLDER_ERROR: {
        code: 'FOLDER_ERROR',
        message: ""
    },
    COMMAND_ERROR: {
        code: 'COMMAND_ERROR',
        message: "Error thrown when running command"
    },
    METADATA_ERROR: {
        code: "METADATA_ERROR",
        message: ""
    },
    DATA_ERROR: {
        code: "DATA_ERROR",
        message: ""
    },
    UNKNOWN_ERROR: {
        code: "UNKNOWN_ERROR",
        message: ""
    }
};