import { FileReader, PathUtils } from "@aurahelper/core";

export function createCommand(program: any): void {
    program
        .command('version')
        .description('Command for get the installed Aura Helper CLI version')
        .action(function (_args: any) {
            run();
        });
}

function run() {
    let config = JSON.parse(FileReader.readFileSync(PathUtils.getAbsolutePath(PathUtils.getDirname(PathUtils.getDirname(PathUtils.getDirname(__dirname))) + '/package.json')));
    console.log("Aura Helper CLI Version: v" + config.version);
}