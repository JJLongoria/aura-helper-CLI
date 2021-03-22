const { FileReader, PathUtils } = require('@ah/core').FileSystem;

exports.createCommand = function (program) {
    program
        .command('version')
        .description('Command for get the installed Aura Helper CLI version')
        .action(function (args) {
            run(args);
        });
}

function run() {
    let config = JSON.parse(FileReader.readFileSync(PathUtils.getAbsolutePath(PathUtils.getDirname(PathUtils.getDirname(PathUtils.getDirname(__dirname))) + '/package.json')));
    console.log("Aura Helper CLI Version: v" + config.version);
}