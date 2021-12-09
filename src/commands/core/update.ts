import { Printer } from "../../output";
import { CoreUtils, PathUtils, ProcessFactory, ProcessHandler } from "@aurahelper/core";
import { ErrorBuilder, ResponseBuilder } from "../response";
import { Errors } from "../errors";
const StrUtils = CoreUtils.StrUtils;

export function createCommand(program: any) {
    program
        .command('update')
        .description('Command for update Aura Helper CLI to the latest version')
        .action(function (_args: any) {
            run();
        });
}

function run() {
    let appPaths = PathUtils.getAuraHelperCLIAppPath();
    let runNpm = false;
    if (appPaths.length > 0) {
        for (const appPath of appPaths) {
            let tmp = StrUtils.replace(appPath, '\\', '/');
            if (tmp.indexOf('/npm/') !== -1) {
                runNpm = true;
                break;
            }
        }
    }
    if (runNpm) {
        updateNPM().then((result) => {
            Printer.printSuccess(new ResponseBuilder(result as string));
        }).catch((error) => {
            Printer.printError(new ErrorBuilder(Errors.COMMAND_ERROR).exception(error));
        });
    } else {
        update(appPaths[0]);
    }
}

function updateNPM() {
    return new Promise(async (resolve, reject) => {
        try {
            const process = ProcessFactory.updateNPM();
            try {
                await ProcessHandler.runProcess(process);
                resolve('Aura Helper Updated Succesfully');
            } catch (error) {
                reject(error);
            }
        } catch (error) {
            reject(error);
        }
    });
}

function update(_appPath: string) {

}