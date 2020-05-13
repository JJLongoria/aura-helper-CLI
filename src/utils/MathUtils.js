class MathUils {

    static round(number, decimalNumbers) {
        return Number(Math.round(number + 'e' + decimalNumbers) + 'e-' + decimalNumbers);
    }

}
module.exports = MathUils;