import { processColors } from '../colorPalette';

describe('ColorPalette', () => {
    describe('processColors', () => {
        it('should return default palette', () => {
            const defaultPalette = ['#1B6DFC', '#0CB7FA', '#FA79FC', '#FB3705', '#F9D307', '#FA9007', '#7D5807', '#B2E606', '#069908', '#7B07FD'];

            expect(processColors()).toEqual(defaultPalette);
        });

        it('should shade only default color if new is the same', () => {
            const labels = ['Herb', 'Tree', 'Shrub', 'Vines', 'Subshrub', '(not specified)'];
            const rules = { Vines: '#1B6DFC', Tree: '#1B6DFC' };
            const expectedPalette = ['#1452bd', '#1B6DFC', '#FA79FC', '#1B6DFC', '#F9D307', '#FA9007'];

            expect(processColors(labels, null, rules)).toEqual(expectedPalette);
        });

        it('should replace colors', () => {
            const labels = ['Herb', 'Tree', 'Shrub', 'Vines', 'Subshrub', '(not specified)'];
            const rules = { Vines: '#FFF', Tree: '#FFF' };
            const expectedPalette = ['#1B6DFC', '#FFF', '#FA79FC', '#FFF', '#F9D307', '#FA9007'];

            expect(processColors(labels, null, rules)).toEqual(expectedPalette);
        });
    });
});
