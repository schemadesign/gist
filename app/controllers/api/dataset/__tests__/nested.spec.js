import { replaceDot } from '../nested';


describe('Nested datasets helpers', () => {
    describe('replaceDot', () => {
        it('should replace dots with unicode characters', () => {
            const input = {
                key: 'val1',
                'unicode.key': 'val2',
                'unicode.nested.key': 'val3',
            };

            expect(replaceDot(input)).toEqual({
                key: 'val1',
                unicode_key: 'val2',
                unicode_nested_key: 'val3',
            });
        });

        it('should not change object without nested keys', () => {
            const input = {
                key: 'val1',
                key2: 'val2',
            };

            expect(replaceDot(input)).toEqual({
                key: 'val1',
                key2: 'val2',
            });
        });
    });
});
