import moment from 'moment';

import { processGroupedResults, getCountAggregationOperators } from '../timeline.helpers';
import { pokemon1, simpsons } from '../../../../../../internals/testing/backend/fixtures/datasets';
import { team1, team2 } from '../../../../../../internals/testing/backend/fixtures/teams';

const DATE_DURATION_DECADE = require('../../../../../config/dataTypes/date.config').DATE_DURATION_DECADE;

describe('timeline helpers', () => {
    describe('processGroupedResults', () => {
        it('should return grouped docs when sort by is date', () => {
            const options = {
                sortBy: 'original_air_date',
                defaultGroupByColumnName_humanReadable: 'original_air_date',
                groupBy_isDate: true,
                filterObj: {},
                groupSize: 10,
            };
            const dataSet = Object.assign({}, simpsons, { _team: team2 });
            const groupedResults = [
                {
                    startDate: moment.utc('1995-10-17T03:24:00').toDate(),
                    endDate: moment.utc('1995-10-21T03:24:00').toDate(),
                    total: 50,
                },
                {
                    startDate: moment.utc('1995-05-10T03:24:00').toDate(),
                    endDate: moment.utc('1995-05-10T03:24:00').toDate(),
                    total: 30,
                },
                {
                    startDate: moment.utc('1995-05-17T03:24:00').toDate(),
                    endDate: moment.utc('1995-06-21T03:24:00').toDate(),
                    total: 2,
                },
            ];
            const groupParams = { groupByUnit: 'months', filterDateFormat: 'YYYY-MM-DD' };
            const result = processGroupedResults(groupedResults, dataSet, options, groupParams);
            expect(result).toMatchSnapshot();
        });

        it('should return grouped docs when sort by is number', () => {
            const options = {
                sortBy: 'original_air_date',
                groupBy: 'Pokemon No_',
                sortByNumber: true,
                filterObj: {},
                groupSize: 10,
            };
            const dataSet = Object.assign({}, pokemon1, { _team: team1 });
            const groupedResults = [
                {
                    group: 100,
                    total: 50,
                },
                {
                    group: 200,
                    total: 30,
                },
                {
                    group: 500,
                    total: 2,
                },
            ];
            const groupParams = { groupNumber: 100 };
            const result = processGroupedResults(groupedResults, dataSet, options, groupParams);
            expect(result).toMatchSnapshot();
        });

        it('should return grouped docs when sort by is string', () => {
            const options = {
                groupBy: 'Type 1',
                filterObj: {},
                groupSize: 10,
            };
            const dataSet = Object.assign({}, pokemon1, { _team: team1 });
            const groupedResults = [
                {
                    group: 'Grass',
                    total: 50,
                },
                {
                    group: 'Water',
                    total: 30,
                },
                {
                    group: 'Fire',
                    total: 2,
                },
            ];
            const groupParams = {};
            const result = processGroupedResults(groupedResults, dataSet, options, groupParams);
            expect(result).toMatchSnapshot();
        });
    });

    describe('getCountAggregationOperators', () => {
        let aggregationOperators, groupParams;

        beforeEach(() => {
            aggregationOperators = [{ $match: { sample: { $exists: true } } }];
            groupParams = { groupIdQueryHelper: 'sample' };
        });

        it('should return default aggregation operators', () => {
            const options = {};
            const result = getCountAggregationOperators(aggregationOperators, groupParams, options);

            expect(result).toMatchSnapshot();
        });

        it('should return aggregation operators for empty group size', () => {
            const options = {
                groupSize: -1,
            };
            const result = getCountAggregationOperators(aggregationOperators, groupParams, options);

            expect(result).toMatchSnapshot();
        });

        it('should return aggregation operators for decade', () => {
            const options = {
                sortByDate: true,
                groupBy_realColumnName: DATE_DURATION_DECADE,
                sortBy_realColumnName: 'Name',
            };
            const result = getCountAggregationOperators(aggregationOperators, groupParams, options);

            expect(result).toMatchSnapshot();
        });
    });
});
