import * as colors from "colors";
import { Color } from "./colorName";
const { CoreUtils } = require('@aurahelper/core');
const Utils = CoreUtils.Utils;

let colorized: boolean = false;

export class Printer {

    static setColorized(isColorized: boolean): void {
        colorized = isColorized;
    }

    static print(text: string, color: number) {
        let selectedColor;
        switch (color) {
            case Color.WHITE:
                selectedColor = colors.white;
                break;
            case Color.GREEN:
                selectedColor = colors.green;
                break;
            case Color.BLUE:
                selectedColor = colors.blue;
                break;
            case Color.RED:
                selectedColor = colors.red;
                break;
            case Color.YELLOW:
                selectedColor = colors.yellow;
                break;
            case Color.GRAY:
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

    static printError(text: string): void {
        if (Utils.isObject(text))
            Printer.print(text.toString(), Color.RED);
        else
            Printer.print(text, Color.RED);
    }

    static printSuccess(text: string): void {
        if (Utils.isObject(text))
            Printer.print(text.toString(), Color.GREEN);
        else
            Printer.print(text, Color.GREEN);
    }

    static printWarning(text: string): void {
        if (Utils.isObject(text))
            Printer.print(text.toString(), Color.YELLOW);
        else
            Printer.print(text, Color.YELLOW);
    }

    static printProgress(text: string): void {
        if (Utils.isObject(text))
            Printer.print(text.toString(), Color.BLUE);
        else
            Printer.print(text, Color.BLUE);
    }

    static printForHelp(args: any) {
        console.log(colors.white('Execute ' + colors.grey(args.parent._name + ' ' + args._name + ' --help') + ' for get help about command usage'));
    }

}