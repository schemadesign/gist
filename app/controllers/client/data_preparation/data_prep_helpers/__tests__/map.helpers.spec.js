import { getMaxValue } from '../map.helpers';
import { pokemon1 } from '../../../../../../internals/testing/backend/fixtures/datasets';
import { hydrateDb } from '../../../../../../internals/testing/backend/utils';

const { AGGREGATE_BY_DISABLED_COLUMN_NAME, AGGREGATE_BY_DEFAULT_COLUMN_NAME } = require('../../../config');

describe('map helpers', () => {
    beforeEach(async () => {
        await hydrateDb();
    });

    describe('getMaxValue', () => {
        it('should return max value', async () => {
            const result = await getMaxValue({
                aggregateBy_realColumnName: 'Max CP',
                mapBy_realColumnName: 'Type 1',
            }, pokemon1);

            expect(result).toEqual(5320);
        });

        it('should return max value2 ', async () => {
            const dataset = { _id: pokemon1._id, fe_views: { views: { map: { mapStyle: 'bubble' } } } };
            const result = await getMaxValue({
                aggregateBy_realColumnName: 'Max CP',
                mapBy_realColumnName: 'Type 1',
            }, dataset);

            expect(result).toEqual(2620);
        });

        it('should return max value of occurs', async () => {
            const dataset = { _id: pokemon1._id, fe_views: { views: { map: { mapStyle: 'bubble' } } } };
            const disabledColumnNameResult = await getMaxValue({
                aggregateBy_realColumnName: AGGREGATE_BY_DISABLED_COLUMN_NAME,
                mapBy_realColumnName: 'Name',
            }, dataset);

            const defaultColumnNameResult = await getMaxValue({
                aggregateBy_realColumnName: AGGREGATE_BY_DEFAULT_COLUMN_NAME,
                mapBy_realColumnName: 'Name',
            }, dataset);

            expect(disabledColumnNameResult).toEqual(1);
            expect(defaultColumnNameResult).toEqual(1);
        });

        it('should return 0 on error', async () => {
            const result = await getMaxValue({}, pokemon1);

            expect(result).toEqual(0);
        });
    });
});
