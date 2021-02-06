((arrays) => {
    Object.assign(arrays, {
        orderOfMagnitude,
    });

    /**
     * Format numbers to order of magnitude shorthand for humans
     * This deviates from SI in that billions === 'B', not 'G'
     * @returns {String|null}
     */
    function orderOfMagnitude(num, fixed) {
        if (num === null) {
            return null;
        }

        if (Math.abs(num) < 1000) {
            return num;
        }

        fixed = (!fixed || fixed < 0) ? 0 : fixed; // number of decimal places to show

        const b = (num).toPrecision(2).split('e'); // get power
        const k = b.length === 1 ? 0 : Math.floor(Math.min(b[1].slice(1), 14) / 3); // floor at decimals, ceiling at trillions
        const c = k < 1 ? num.toFixed(0 + fixed) : (num / Math.pow(10, k * 3)).toFixed(1 + fixed); // divide by power
        const d = c < 0 ? -Math.abs(c) : Math.abs(c); // enforce -0 is 0

        return d + ['', 'K', 'M', 'B', 'T'][k]; // append power
    }
})(window.arrays);
