const fileSystem = require('../fileSystem');
const Paths = fileSystem.Paths;
const FileReader = fileSystem.FileReader;

class Utils {

    static getNewLines(number) {
        let newLines = '';
        for (let index = 0; index < number; index++) {
            newLines += '\n';
        }
        return newLines;
    }

    static getWhitespaces(number) {
        let whitespace = '';
        for (let index = 0; index < number; index++) {
            whitespace += ' ';
        }
        return whitespace;
    }

    static getNextToken(tokens, index) {
        if (index + 1 < tokens.length)
            return tokens[index + 1];
    }

    static getTwoNextToken(tokens, index) {
        if (index + 2 < tokens.length)
            return tokens[index + 2];
    }

    static getLastToken(tokens, index) {
        if (index - 1 >= 0)
            return tokens[index - 1];
    }

    static getTwoLastToken(tokens, index) {
        if (index - 2 >= 0)
            return tokens[index - 2];
    }
}
exports.Utils = Utils;