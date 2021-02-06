import { keys, pickBy, isNil } from 'lodash';

import {
    activeSearch_matchOp_orErrDescription,
    publishMatch,
    filterObjFromQueryParams,
    fieldOverrideIfExists,
} from '../func';
import { datasetCustomDelineatedField as dataset } from '../../../../internals/testing/backend/fixtures/datasets';


describe('Func', () => {
    describe('activeSearch_matchOp_orErrDescription', () => {
        it('should query the chosen search field', () => {
            const searchField = 'Searchable';
            const searchFieldPath = `rowParams.${searchField}`;
            const searchValue = 'Joe';

            expect(activeSearch_matchOp_orErrDescription(dataset, searchField, searchValue))
                .toHaveProperty(['matchOps', 0, '$match', searchFieldPath, '$regex'], searchValue);
        });

        it('should query the actual search field if searching by an overridden field name', () => {
            const humanReadableColumnName = 'Override Searchable';
            const realColumnName = 'Searchable 2';
            const searchFieldPath = `rowParams.${realColumnName}`;
            const searchValue = 'Bob';

            expect(activeSearch_matchOp_orErrDescription(dataset, humanReadableColumnName, searchValue))
                .toHaveProperty(['matchOps', 0, '$match', searchFieldPath, '$regex'], searchValue);
        });

        it('should query all non-excluded string and custom-delineated fields if global search', () => {
            const searchField = 'All Fields';
            const searchValue = 'cat';
            const globalSearch = activeSearch_matchOp_orErrDescription(dataset, searchField, searchValue);

            keys(pickBy(dataset.fe_excludeFields, isNil)).forEach(field => {
                const fieldPath = `rowParams.${field}`;
                const coercionScheme = dataset.raw_rowObjects_coercionScheme[field];

                if ((coercionScheme && coercionScheme.operation === 'ToString') ||
                    (dataset.customFieldsToProcess.some(customField => customField.fieldType === 'array' && customField.fieldName === field))) {
                    expect(globalSearch).toHaveProperty(['matchOps', 0, '$match', '$or'], expect.arrayContaining([
                        expect.objectContaining({
                            [fieldPath]: expect.anything(),
                        }),
                    ]));
                }
            });
        });

        it('should give back an overridden field when there is one', () => {
            // There is an overridden field
            const dataSourceDescription = { fe_displayTitleOverrides: { hello: 'hi' } };
            expect(fieldOverrideIfExists('hello', dataSourceDescription)).toBe(dataSourceDescription.fe_displayTitleOverrides.hello);

            // There is not an overridden field
            const fieldNotInOverride = 'ha-this ain\'t in the override';
            expect(fieldOverrideIfExists(fieldNotInOverride, dataSourceDescription)).toBe(fieldNotInOverride);

        });
    });

    describe('publishMatch', () => {
        const publishMatchQuery = {
            $match: {
                published: { $ne: false },
            },
        };

        it('should return array containing publish match query when empty array given', () => {
            expect(publishMatch([])).toEqual([publishMatchQuery]);
        });

        it('should insert publish match query as the first matching operator', () => {
            expect(publishMatch([{ $match: { key: 'val' } }, { $group: { key: 'val' } }]))
                .toEqual([
                    publishMatchQuery,
                    { $match: { key: 'val' } },
                    { $group: { key: 'val' } },
                ]);
        });
    });

    describe('filterObjFromQueryParams', () => {
        it('should omit reserved keys', () => {
            const input = {
                datasetId: 'value',
                source_key: 'value',
                sortBy: 'value',
                page: 'value',
                groupBy: 'value',
                chartBy: 'value',
                stackBy: 'value',
                mapBy: 'value',
                aggregateBy: 'value',
                searchQ: 'value',
                searchCol: 'value',
                embed: 'value',
                groupSize: 'value',
                preview: 'value',
                xAxis: 'value',
                yAxis: 'value',
                groupByDuration: 'value',
                groupByRange: 'value',
                limit: 'value',
                nested: 'value',
                horizontal: 'value',
                normalize: 'value',
                sortDirection: 'value',
                accessibility: 'value',
                revision: 'value',
                secondaryCol: 'value',
                timeValue: 'value',
                radius: 'value',
                other: 'value',
                colFilter: 'value',
            };

            expect(filterObjFromQueryParams(input)).toEqual({ other: ['value'] });
        });
    });
});
