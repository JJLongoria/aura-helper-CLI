const Output = require('../../output');
const Config = require('../../main/config');
const FileSystem = require('../../fileSystem');
const StrUtils = require('../../utils/strUtils');
const Paths = FileSystem.Paths;

exports.createCommand = function (program) {
    program
        .command('update')
        .description('Command for update Aura Helper CLI to the latest version')
        .action(function (args) {
            run(args);
        });
}

function run() {
    let appPaths = Paths.getAppPath();
    if (appPaths.length > 1) {
        for (const appPath of appPaths) {
            let tmp = StrUtils.replace(appPath, '\\', '/');
            if (tmp.indexOf('/npm/') !== -1)
                Output.Printer.printError("Aura Helper installed with NPM. Please, update it with NPM.");
                Output.Printer.print("Run npm update -g aura-helper", Output.Color.GRAY)
                return;
        }
    }
    update(appPaths[0]);
}

function update(appPath){
    
}