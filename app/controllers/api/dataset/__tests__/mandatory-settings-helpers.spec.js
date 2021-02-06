import { determineMandatorySettings, nestedObject as isNested } from '../mandatory-settings-helpers';
import {
    pokemonColumns,
    stringColumns,
    gameOfThronesColumns,
} from '../../../../../internals/testing/backend/fixtures/columns';
import {
    pokemonRowObjects,
    stringRowObjects,
    gameOfThronesRowObjects,
} from '../../../../../internals/testing/backend/fixtures/rowObjects';
import {
    pokemonExcludeFields,
    pokemonWithExcludedFields,
    stringExcludeFields,
    gameOfThronesExcludeFields,
} from '../../../../../internals/testing/backend/fixtures/excludeFields';


describe('Dataset', () => {

    describe('isNested', () => {
        it('should return false if sample is array of strings', () => {
            const strings = ['puppy', 'flowers', 'chocolate'];

            expect(isNested(strings)).toBe(false);
        });

        it('should return true if array[0] is an object', () => {
            const arrayOfObjects = [{
                a: 'b',
                c: 'd',
            }];

            expect(isNested(arrayOfObjects)).toBe(true);
        });

        it('should return true if sample is object', () => {
            const someObject = {
                a: 'b',
                c: 'd',
            };

            expect(isNested(someObject)).toBe(true);
        });

        it('should return false if sample is string', () => {
            expect(isNested('test')).toBe(false);
        });

        it('should return false if sample is date', () => {
            expect(isNested(new Date())).toBe(false);
        });

        it('should return false if sample is number', () => {
            expect(isNested(23)).toBe(false);
        });

        it('should return false if sample is array of Dates', () => {
            const arrayOfDates = [new Date(), new Date(), new Date()];

            expect(isNested(arrayOfDates)).toBe(false);
        });
    });

    describe('determineMandatorySettings', () => {
        // NOTE: the order of which the settings are assigned will be consistent with the order of the rowObjects
        const generateValue = chartType => ({
            views: {
                [chartType]: {
                    visible: true,
                },
            },
        });
        const generateUpdateQuery = chartType => ({
            $set: {
                fe_views: generateValue(chartType),
            },
        });

        it('should return view settings for barChart', () => {
            const updateQuery = generateUpdateQuery('barChart');
            const value = generateValue('barChart');
            const result = determineMandatorySettings(pokemonColumns, pokemonRowObjects, [], pokemonExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.barChart', {
                bars: ['Max HP'],
                defaultGroupByColumnName: 'Name',
                defaultStackByColumnName: 'Pokemon No_',
                visible: true,
            });
        });

        it('should return view settings for barChart when simple option is not available. (When there are no integers, floats or percents)', () => {
            const updateQuery = generateUpdateQuery('barChart');
            const value = generateValue('barChart');
            const result = determineMandatorySettings(stringColumns, stringRowObjects, [], stringExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.barChart', {
                defaultGroupByColumnName: 'string2',
                defaultStackByColumnName: 'string3',
                visible: true,
            });
        });

        it('should return view settings for gallery', () => {
            const updateQuery = generateUpdateQuery('gallery');
            const value = generateValue('gallery');
            const result = determineMandatorySettings(pokemonColumns, pokemonRowObjects, [], pokemonExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.gallery', {
                defaultSortByColumnName: 'Pokemon No_',
                visible: true,
            });
        });

        it('should return view settings for globe', () => {
            const updateQuery = generateUpdateQuery('globe');
            const value = generateValue('globe');
            const result = determineMandatorySettings(pokemonColumns, pokemonRowObjects, [], pokemonExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.globe', {
                coordinateTitle: 'Pokemon No_',
                visible: true,
            });
        });

        it('should return view settings for lineGraph', () => {
            const updateQuery = generateUpdateQuery('lineGraph');
            const value = generateValue('lineGraph');
            const result = determineMandatorySettings(pokemonColumns, pokemonRowObjects, [], pokemonExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.lineGraph', {
                lines: ['Max HP'],
                defaultGroupByColumnName: 'Max CP',
                defaultStackByColumnName: 'Pokemon No_',
                visible: true,
            });
        });

        it('should return view settings with error message for lineGraph when only strings available', () => {
            const updateQuery = generateUpdateQuery('lineGraph');
            const value = generateValue('lineGraph');
            const result = determineMandatorySettings(stringColumns, stringRowObjects, [], stringExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('message', 'Your data must contain at least one number field to display the line graph');
            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.lineGraph.visible', false);
        });

        it('should return view settings for areaChart', () => {
            const updateQuery = generateUpdateQuery('areaChart');
            const value = generateValue('areaChart');
            const result = determineMandatorySettings(gameOfThronesColumns, gameOfThronesRowObjects, [], gameOfThronesExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.areaChart', {
                areas: ['season'],
                defaultGroupByColumnName: 'airstamp',
                defaultStackByColumnName: 'summary',
                visible: true,
            });
        });

        it('should return view settings with error message for areaChart when only strings available', () => {
            const updateQuery = generateUpdateQuery('areaChart');
            const value = generateValue('areaChart');
            const result = determineMandatorySettings(stringColumns, stringRowObjects, [], stringExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('message', 'Your data must contain at least one number field to display the area chart.');
            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.areaChart.visible', false);
        });

        it('should return view settings for map', () => {
            const updateQuery = generateUpdateQuery('map');
            const value = generateValue('map');
            const result = determineMandatorySettings(pokemonColumns, pokemonRowObjects, [], pokemonExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.map', {
                defaultMapByColumnName: 'Pokemon No_',
                defaultAggregateByColumnName: 'Max CP',
                visible: true,
            });
        });

        it('should return view settings for pieChart', () => {
            const updateQuery = generateUpdateQuery('pieChart');
            const value = generateValue('pieChart');
            const result = determineMandatorySettings(stringColumns, stringRowObjects, [], stringExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.pieChart', {
                defaultGroupByColumnName: 'string3',
                visible: true,
            });
        });

        it('should return view settings for pieSet', () => {
            const updateQuery = generateUpdateQuery('pieSet');
            const value = generateValue('pieSet');
            const result = determineMandatorySettings(stringColumns, stringRowObjects, [], stringExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.pieSet', {
                defaultChartByColumnName: 'string3',
                defaultGroupByColumnName: 'string2',
                visible: true,
            });
        });

        it('should return view settings for scatterplot', () => {
            const updateQuery = generateUpdateQuery('scatterplot');
            const value = generateValue('scatterplot');
            const result = determineMandatorySettings(pokemonColumns, pokemonRowObjects, [], pokemonExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.scatterplot', {
                defaultAggregateByColumnName: 'Max HP',
                defaultXAxisField: 'Pokemon No_',
                defaultYAxisField: 'Max CP',
                visible: true,
            });
        });

        it('should return false view settings with error message for scatterplot', () => {
            const updateQuery = generateUpdateQuery('scatterplot');
            const value = generateValue('scatterplot');
            const result = determineMandatorySettings(stringColumns, stringRowObjects, [], stringExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('message', 'Your data must contain at least two number fields to display the Scatterplot.');
            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.scatterplot.visible', false);
        });

        it('should return view settings for bubbleChart', () => {
            const updateQuery = generateUpdateQuery('bubbleChart');
            const value = generateValue('bubbleChart');
            const result = determineMandatorySettings(gameOfThronesColumns, gameOfThronesRowObjects, [], gameOfThronesExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.bubbleChart', {
                defaultXAxisField: 'runtime',
                defaultYAxisField: 'number',
                defaultRadiusField: 'season',
                defaultChartByColumnName: 'url',
                defaultGroupByColumnName: 'airstamp',
                visible: true,
            });
        });

        it('should return false view settings with error message for bubbleChart', () => {
            const updateQuery = generateUpdateQuery('bubbleChart');
            const value = generateValue('bubbleChart');
            const result = determineMandatorySettings(stringColumns, stringRowObjects, [], stringExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('message', 'Your data must contain at least one number field, a date field, and a text field to display the bubble chart.');
            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.bubbleChart.visible', false);
        });

        it('should return view settings for timeline', () => {
            const updateQuery = generateUpdateQuery('timeline');
            const value = generateValue('timeline');
            const result = determineMandatorySettings(gameOfThronesColumns, gameOfThronesRowObjects, [], gameOfThronesExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.timeline', {
                defaultGroupByColumnName: 'airtime',
                defaultSortByColumnName: 'summary',
                visible: true,
            });
        });

        it('should return view settings with error message for wordCloud', () => {
            const updateQuery = generateUpdateQuery('wordCloud');
            const value = generateValue('wordCloud');
            const result = determineMandatorySettings(gameOfThronesColumns, gameOfThronesRowObjects, [], gameOfThronesExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('message', 'You must add keywords to your Word Cloud before it can be displayed.');
            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.wordCloud.visible', false);
        });

        it('should return view settings for regionalMap', () => {
            const updateQuery = generateUpdateQuery('regionalMap');
            const value = generateValue('regionalMap');
            const result = determineMandatorySettings(pokemonColumns, pokemonRowObjects, [], pokemonExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.regionalMap', {
                defaultAggregateByColumnName: 'Pokemon No_',
                visible: true,
            });
        });

        it('should return view settings with error message for regionalMap when only strings available', () => {
            const updateQuery = generateUpdateQuery('regionalMap');
            const value = generateValue('regionalMap');
            const result = determineMandatorySettings(stringColumns, stringRowObjects, [], stringExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('message', 'Your data must contain at least one number field to display the regional map');
            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.regionalMap.visible', false);
        });

        it('should return view settings with visible: false', () => {
            const updateQuery = {
                $set: {
                    fe_views: {
                        views: {
                            gallery: {
                                visible: false,
                            },
                        },
                    },
                },
            };
            const value = {
                views: {
                    gallery: {
                        visible: false,
                    },
                },
            };
            const result = determineMandatorySettings(stringColumns, stringRowObjects, [], stringExcludeFields, updateQuery, value);

            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.gallery', {
                visible: false,
                defaultSortByColumnName: 'string3',
            });
        });

        it('should return view settings without excluded fields', () => {
            const updateQuery = {
                $set: {
                    fe_views: {
                        views: {
                            gallery: {
                                visible: true,
                            },
                        },
                    },
                },
            };
            const value = {
                views: {
                    gallery: {
                        visible: true,
                        defaultSortByColumnName: 'string1',
                    },
                },
            };

            const excludeFields = {
                string1: true,
            };
            const result = determineMandatorySettings(stringColumns, stringRowObjects, ['string1', 'string2', 'string3'], excludeFields, updateQuery, value);

            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.gallery', {
                visible: true,
                defaultSortByColumnName: 'string2',
            });
        });

        it('should not return excluded fields', () => {
            const updateQuery = generateUpdateQuery('barChart');
            const value = generateValue('barChart');
            const result = determineMandatorySettings(pokemonColumns, pokemonRowObjects, [], pokemonWithExcludedFields, updateQuery, value);

            expect(result).toHaveProperty('updateQuery.$set.fe_views.views.barChart', {
                bars: ['Max CP'],
                defaultGroupByColumnName: 'Type 1',
                defaultStackByColumnName: 'Name',
                visible: true,
            });
        });
    });
});
