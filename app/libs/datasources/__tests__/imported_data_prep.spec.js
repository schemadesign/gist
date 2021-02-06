import { merge } from 'lodash';

import { pokemon1 } from '../../../../internals/testing/backend/fixtures/datasets';
import { pokemonWithExcludedFields } from '../../../../internals/testing/backend/fixtures/excludeFields';
import {
    RealColumnNameFromHumanReadableColumnName,
    HumanReadableFEVisibleColumnNames,
    HumanReadableFEVisibleColumnNames_orderedForDropdown,
    HumanReadableFEVisibleColumnNames_orderedForSearchByDropdown,
} from '../imported_data_preparation';


describe('Imported data preparation', () => {
    describe('RealColumnNameFromHumanReadableColumnName', () => {
        it('should get real column name', () => {
            expect(RealColumnNameFromHumanReadableColumnName('Type1_overridden', pokemon1)).toEqual('Type 1');
        });
    });

    describe('HumanReadableFEVisibleColumnNames', () => {
        it('should prepare pokemon1 fields', () => {
            const description = pokemon1;
            const fields = HumanReadableFEVisibleColumnNames(description);

            expect(fields).toEqual(['Image URL', 'Max CP', 'Max HP', 'Name', 'Pokemon No_', 'Type 2', 'Type1_overridden']);
        });

        it('should exclude excluded fields', () => {
            const description = {
                ...pokemon1,
                fe_excludeFields: pokemonWithExcludedFields,
            };
            const fields = HumanReadableFEVisibleColumnNames(description);

            expect(fields).toEqual(['Max CP', 'Max HP', 'Name', 'Type 2', 'Type1_overridden']);
        });

        it('should sort fields properly when fe_fieldDisplayOrder is not empty', () => {
            const description = {
                ...pokemon1,
                fe_fieldDisplayOrder: ['Name', 'Type 2'],
            };
            const fields = HumanReadableFEVisibleColumnNames(description);

            expect(fields).toEqual(['Name', 'Type 2', 'Image URL', 'Max CP', 'Max HP', 'Pokemon No_', 'Type1_overridden']);
        });
    });

    describe('HumanReadableFEVisibleColumnNames_orderedForSearchByDropdown', () => {
        it('should prepare pokemon1 fields', () => {
            const description = pokemon1;
            const fields = HumanReadableFEVisibleColumnNames_orderedForSearchByDropdown(description);

            expect(fields).toEqual([
                { name: 'All Fields', operation: 'toString' },
                { name: 'Image URL', operation: 'ToString' },
                { name: 'Max CP', operation: 'ToInteger' },
                { name: 'Max HP', operation: 'ToInteger' },
                { name: 'Name', operation: 'ToString' },
                { name: 'Pokemon No_', operation: 'ToInteger' },
                { name: 'Type 2', operation: 'ToString' },
                { name: 'Type1_overridden', operation: 'ToString' },
            ]);
        });

        it('should exclude excluded fields', () => {
            const description = {
                ...pokemon1,
                fe_excludeFields: pokemonWithExcludedFields,
            };
            const fields = HumanReadableFEVisibleColumnNames_orderedForSearchByDropdown(description);

            expect(fields).toEqual([
                { name: 'All Fields', operation: 'toString' },
                { name: 'Max CP', operation: 'ToInteger' },
                { name: 'Max HP', operation: 'ToInteger' },
                { name: 'Name', operation: 'ToString' },
                { name: 'Type 2', operation: 'ToString' },
                { name: 'Type1_overridden', operation: 'ToString' },
            ]);
        });

        it('should sort fields properly when fe_fieldDisplayOrder is not empty', () => {
            const description = {
                ...pokemon1,
                fe_fieldDisplayOrder: ['Name', 'Type 2'],
            };
            const fields = HumanReadableFEVisibleColumnNames_orderedForSearchByDropdown(description);

            expect(fields).toEqual([
                { name: 'All Fields', operation: 'toString' },
                { name: 'Name', operation: 'ToString' },
                { name: 'Type 2', operation: 'ToString' },
                { name: 'Image URL', operation: 'ToString' },
                { name: 'Max CP', operation: 'ToInteger' },
                { name: 'Max HP', operation: 'ToInteger' },
                { name: 'Pokemon No_', operation: 'ToInteger' },
                { name: 'Type1_overridden', operation: 'ToString' },
            ]);
        });

        it('should assign operation, outputFormat and currency', () => {
            const description = merge({}, pokemon1, {
                raw_rowObjects_coercionScheme: {
                    'Max HP': {
                        outputFormat: 'YYYY-MM-DD',
                    },
                    'Max CP': {
                        currency: 'USD',
                    },
                },
            });
            const fields = HumanReadableFEVisibleColumnNames_orderedForSearchByDropdown(description);

            expect(fields).toEqual([
                { name: 'All Fields', operation: 'toString' },
                { name: 'Image URL', operation: 'ToString' },
                { name: 'Max CP', operation: 'ToInteger', currency: 'USD' },
                { name: 'Max HP', operation: 'ToInteger', outputFormat: 'YYYY-MM-DD' },
                { name: 'Name', operation: 'ToString' },
                { name: 'Pokemon No_', operation: 'ToInteger' },
                { name: 'Type 2', operation: 'ToString' },
                { name: 'Type1_overridden', operation: 'ToString' },
            ]);
        });
    });

    describe('HumanReadableFEVisibleColumnNames_orderedForDropdown', () => {
        it('should prepare pokemon1 "sort by" fields properly', () => {
            const description = pokemon1;
            const fields = HumanReadableFEVisibleColumnNames_orderedForDropdown(description, 'gallery', 'SortBy');

            expect(fields).toEqual(['Image URL', 'Max CP', 'Max HP', 'Name', 'Pokemon No_', 'Type 2', 'Type1_overridden']);
        });

        it('should join custom fields', () => {
            const description = {
                ...pokemon1,
                customFieldsToProcess: [
                    { fieldName: 'Something', fieldType: 'array' },
                ],
            };
            const fields = HumanReadableFEVisibleColumnNames_orderedForDropdown(description, 'gallery', 'SortBy');

            expect(fields).toEqual(['Image URL', 'Max CP', 'Max HP', 'Name', 'Pokemon No_', 'Something', 'Type 2', 'Type1_overridden']);
        });

        it('should not add "Number of Items" for "AggregateBy" dropdown when it is not available', () => {
            const description = merge({}, pokemon1, {
                fe_views: {
                    views: {
                        gallery: {
                            fieldsNotAvailableAsAggregateByColumns: ['Number of Items'],
                        }
                    }
                }
            });
            const fields = HumanReadableFEVisibleColumnNames_orderedForDropdown(description, 'gallery', 'AggregateBy');

            expect(fields).toEqual(['Image URL', 'Max CP', 'Max HP', 'Name', 'Pokemon No_', 'Type 2', 'Type1_overridden']);
        });

        it('should exclude excluded fields', () => {
            const description = {
                ...pokemon1,
                fe_excludeFields: pokemonWithExcludedFields,
            };
            const fields = HumanReadableFEVisibleColumnNames_orderedForDropdown(description, 'gallery', 'SortBy');

            expect(fields).toEqual(['Max CP', 'Max HP', 'Name', 'Type 2', 'Type1_overridden']);
        });

        it('should exclude fields which are not available for passed view and dropdown', () => {
            const description = merge({}, pokemon1, {
                fe_views: {
                    views: {
                        gallery: {
                            fieldsNotAvailableAsSortByColumns: ['Name'],
                        }
                    }
                }
            });
            const fields = HumanReadableFEVisibleColumnNames_orderedForDropdown(description, 'gallery', 'SortBy');

            expect(fields).toEqual(['Image URL', 'Max CP', 'Max HP', 'Pokemon No_', 'Type 2', 'Type1_overridden']);
        });

        it('should exclude fields whose types do not match restrictedType', () => {
            const description = pokemon1;
            const restrictedType = 'ToInteger';
            const fields = HumanReadableFEVisibleColumnNames_orderedForDropdown(description, 'gallery', 'SortBy', restrictedType);

            expect(fields).toEqual(['Max CP', 'Max HP', 'Pokemon No_']);
        });

        it('should exclude fields whose types do not match restrictedTypes', () => {
            const description = pokemon1;
            const restrictedTypes = ['ToString', 'ToDate'];
            const fields = HumanReadableFEVisibleColumnNames_orderedForDropdown(description, 'gallery', 'SortBy', restrictedTypes);

            expect(fields).toEqual(['Image URL', 'Name', 'Type 2', 'Type1_overridden']);
        });

        it('should sort fields properly when fe_fieldDisplayOrder is not empty', () => {
            const description = {
                ...pokemon1,
                fe_fieldDisplayOrder: ['Name', 'Type 2'],
            };
            const fields = HumanReadableFEVisibleColumnNames_orderedForDropdown(description, 'gallery', 'SortBy');

            expect(fields).toEqual(['Name', 'Type 2', 'Image URL', 'Max CP', 'Max HP', 'Pokemon No_', 'Type1_overridden']);
        });
    });
});
