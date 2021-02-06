const { positiveInteger } = require('../content-helpers');

describe('positiveInteger', () => {
    it('should return the integer 5, provided a string \'5\'', () => {
        const int = positiveInteger('5', 25);

        expect(int).toBe(5);
    });

    it('should return the fallback value, provided a string that is not parseable', () => {
        const int = positiveInteger('not a number', 25);

        expect(int).toBe(25);
    });

    it('should return the fallback value, provided a string \'0\'', () => {
        const int = positiveInteger('0', 25);

        expect(int).toBe(25);
    });
});
