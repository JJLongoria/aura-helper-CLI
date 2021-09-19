const colors = require('colors');
const COLORS = require('./colorName');
const { Utils } = require('@aurahelper/core').CoreUtils;

let colorized = false;

class Printer {

    static setColorized(isColorized) {
        colorized = isColorized;
    }

    static print(text, color) {
        let selectedColor;
        switch (color) {
            case COLORS.WHITE:
                selectedColor = colors.white;
                break;
            case COLORS.GREEN:
                selectedColor = colors.green;
                break;
            case COLORS.BLUE:
                selectedColor = colors.blue;
                break;
            case COLORS.RED:
                selectedColor = colors.red;
                break;
            case COLORS.YELLOW:
                selectedColor = colors.yellow;
                break;
            case COLORS.GRAY:
                selectedColor = colors.gray;
                break;
            default:
                selectedColor = colors.white;
                break;
        }
        if (colorized)
            console.log(selectedColor(text));
        else
            console.log(text);

    }

    static printError(text) {
        if(Utils.isObject(text))
            Printer.print(text.toString(), COLORS.RED);
        else
            Printer.print(text, COLORS.RED);
    }

    static printSuccess(text) {
        if(Utils.isObject(text))
            Printer.print(text.toString(), COLORS.GREEN);
        else
            Printer.print(text, COLORS.GREEN);
    }

    static printWarning(text) {
        if(Utils.isObject(text))
            Printer.print(text.toString(), COLORS.YELLOW);
        else
            Printer.print(text, COLORS.YELLOW);
    }

    static printProgress(text) {
        if(Utils.isObject(text))
            Printer.print(text.toString(), COLORS.BLUE);
        else
            Printer.print(text, COLORS.BLUE);
    }

    static printForHelp(args) {
        console.log(colors.white('Execute ' + colors.grey(args.parent._name + ' ' + args._name + ' --help') + ' for get help about command usage'));
    }

}
module.exports = Printer;