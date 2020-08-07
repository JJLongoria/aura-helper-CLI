const FileSystem = require('../../fileSystem');

exports.createCommand = function (program) {
    program
        .command('version')
        .description('Command for get the installed Aura Helper CLI version')
        .action(function (args) {
            run(args);
        });
}

function run() {
    let config = JSON.parse(FileSystem.FileReader.readFileSync(FileSystem.Paths.getAbsolutePath('package.json')));
    console.log("Aura Helper CLI Version: v"  + config.version);
}