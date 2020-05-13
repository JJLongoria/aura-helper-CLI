const fs = require('fs');
const path = require('path');

class FileReader {
    static readDocument(document) {
        var lines = [];
        for (var i = 0; i < document.lineCount; i++) {
            lines.push(document.lineAt(i).text);
        }
        return lines.join('\n');
    }

    static readFileSync(filePath) {
        return fs.readFileSync(filePath, 'utf8');
    }

    static readFile(filePath, callback) {
        fs.readFile(filePath, callback);
    }

    static readDirSync(folderPath, filters) {
        let folderContent = fs.readdirSync(folderPath);
        if (filters) {
            let result = [];
            for (const contentPath of folderContent) {
                if (filters.onlyFolders && fs.lstatSync(folderPath + '\\' + contentPath).isDirectory()) {
                    result.push(contentPath);
                } else if (filters.onlyFiles) {
                    if (fs.lstatSync(folderPath + '\\' + contentPath).isFile()) {
                        if (filters.extensions && filters.extensions.length > 0) {
                            if (filters.extensions.includes(path.extname(contentPath)))
                                result.push(contentPath);
                        } else {
                            result.push(contentPath);
                        }
                    }
                } else {
                    if (filters.extensions && filters.extensions.length > 0) {
                        if (filters.extensions.includes(path.extname(contentPath)))
                            result.push(contentPath);
                    } else {
                        result.push(contentPath);
                    }
                }
            }
            return result;
        } else {
            return folderContent;
        }
    }



    static getAllFiles(dir) {
        return new Promise(function (resolve, rejected) {
            let results = [];
            fs.readdir(dir, function (err, list) {
                if (err)
                    rejected(err);
                var pending = list.length;
                if (!pending)
                    resolve(results);
                list.forEach(function (file) {
                    file = path.resolve(dir, file);
                    fs.stat(file, async function (err, stat) {
                        if (stat && stat.isDirectory()) {
                            results.push(file);
                            let res = await FileReader.getAllFiles(file);
                            results = results.concat(res);
                            if (!--pending)
                                resolve(results);
                        } else {
                            results.push(file);
                            if (!--pending)
                                resolve(results);
                        }
                    });
                });
            });
        });
    }
}
exports.FileReader = FileReader;