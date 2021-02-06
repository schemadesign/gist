import { pokemon1 } from '../../../../../../internals/testing/backend/fixtures/datasets';
import { hydrateDb } from '../../../../../../internals/testing/backend/utils';
import { Lazy_Shared_ProcessedRowObject_MongooseContext } from '../../../../../models/processed_row_objects';

import {
    addDefaultAggregationOperators,
    aggregateProcessedRowObjects,
    getFieldTypeAggregationOperators,
} from '../aggregation.helpers';


describe('group helpers', () => {
    describe('addDefaultAggregationOperators', () => {
        it('should add aggregation operators', () => {
            const options = {
                isFilterActive: true,
                isSearchActive: true,
                filterObj: {
                    'Type 1': 'Water',
                },
                searchCol: 'Name',
                searchQ: 'Blastoise',
            };
            const result = addDefaultAggregationOperators(pokemon1, options);

            expect(result).toMatchSnapshot();
        });
    });

    describe('aggregateProcessedRowObjects', () => {
        let ProcessedRowsModel;

        beforeEach(async () => {
            await hydrateDb();
            ProcessedRowsModel = Lazy_Shared_ProcessedRowObject_MongooseContext(pokemon1._id).Model;
        });

        it('should aggregate data from the db', async () => {
            const aggregationOperators = [
                {
                    $group: {
                        _id: '$rowParams.Type 1',
                        name: { $addToSet: '$rowParams.Name' },
                    },
                },
            ];
            const result = await aggregateProcessedRowObjects(ProcessedRowsModel, aggregationOperators);

            expect(result).toMatchSnapshot();
        });
    });

    describe('getFieldTypeAggregationOperators', () => {
        it('should return aggregation operators for date', () => {
            const result = getFieldTypeAggregationOperators('First', { isDate: true });

            expect(result).toMatchSnapshot();
        });

        it('should return aggregation operators for number', () => {
            const result = getFieldTypeAggregationOperators('Second', { isNumber: true });

            expect(result).toMatchSnapshot();
        });

        it('should return aggregation operators for other type', () => {
            const result = getFieldTypeAggregationOperators('Third', {});

            expect(result).toMatchSnapshot();
        });
    });
});
