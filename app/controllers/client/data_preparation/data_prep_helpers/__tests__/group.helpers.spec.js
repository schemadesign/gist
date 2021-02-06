import {
    getGroupByDurationParams,
    getGroupByRangeParams,
    getGroupByColumnParams,
} from '../group.helpers';
import {
    DATE_DURATION_DECADE,
    DATE_DURATION_YEAR,
    DATE_DURATION_MONTH,
    DATE_DURATION_WEEK,
    DATE_DURATION_DAY,
} from '../../../../../config/dataTypes/date.config';


describe('group helpers', () => {
    describe('getGroupByDurationParams', () => {
        it('should return decade params', () => {
            const result = getGroupByDurationParams(DATE_DURATION_DECADE, 'order');
            expect(result).toMatchSnapshot();
        });

        it('should return month params', () => {
            const result = getGroupByDurationParams(DATE_DURATION_MONTH, 'order');
            expect(result).toMatchSnapshot();
        });

        it('should return week params', () => {
            const result = getGroupByDurationParams(DATE_DURATION_WEEK, 'order');
            expect(result).toMatchSnapshot();
        });

        it('should return day params', () => {
            const result = getGroupByDurationParams(DATE_DURATION_DAY, 'order');
            expect(result).toMatchSnapshot();
        });

        it('should return year params', () => {
            const result = getGroupByDurationParams(DATE_DURATION_YEAR, 'order');
            expect(result).toMatchSnapshot();
        });

        it('should return default params', () => {
            const result = getGroupByDurationParams('', 'order');
            expect(result).toMatchSnapshot();
        });
    });

    describe('getGroupByRangeParams', () => {
        it('should return range params', () => {
            const result = getGroupByRangeParams('100s', 'size');
            expect(result).toMatchSnapshot();
        });
    });

    describe('getGroupByColumnParams', () => {
        it('should return column params', () => {
            const result = getGroupByColumnParams('name');
            expect(result).toMatchSnapshot();
        });
    });
});
