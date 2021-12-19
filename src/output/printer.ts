import { Color } from "./colorName";
const { CoreUtils } = require('@aurahelper/core');
const Utils = CoreUtils.Utils;

let colorized: boolean = false;

export class Printer {

    static setColorized(isColorized: boolean): void {
        colorized = isColorized;
    }

    static print(text: string, color: number) {
        if (colorized) {
            switch (color) {
                case Color.WHITE:
                    console.log('\x1b[37m' + text + '\x1b[0m');
                    break;
                case Color.GREEN:
                    console.log('\x1b[32m' + text + '\x1b[0m');
                    break;
                case Color.BLUE:
                    console.log('\x1b[34m' + text + '\x1b[0m');
                    break;
                case Color.RED:
                    console.log('\x1b[31m' + text + '\x1b[0m');
                    break;
                case Color.YELLOW:
                    console.log('\x1b[33m' + text + '\x1b[0m');
                    break;
                case Color.GRAY:
                    console.log(text);
                    break;
                default:
                    console.log('\x1b[37m' + text + '\x1b[0m');
                    break;
            }
        } else {
            console.log(text);
        }

    }

    static printError(text: string | any): void {
        if (Utils.isObject(text)) {
            Printer.print(text.toString(), Color.RED);
        } else {
            Printer.print(text, Color.RED);
        }
    }

    static printSuccess(text: string | any): void {
        if (Utils.isObject(text)) {
            Printer.print(text.toString(), Color.GREEN);
        } else {
            Printer.print(text, Color.GREEN);
        }
    }

    static printWarning(text: string | any): void {
        if (Utils.isObject(text)) {
            Printer.print(text.toString(), Color.YELLOW);
        } else {
            Printer.print(text, Color.YELLOW);
        }
    }

    static printProgress(text: string | any): void {
        if (Utils.isObject(text)) {
            Printer.print(text.toString(), Color.BLUE);
        } else {
            Printer.print(text, Color.BLUE);
        }
    }
}