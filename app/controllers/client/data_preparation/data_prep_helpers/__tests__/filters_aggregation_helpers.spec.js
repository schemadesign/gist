import { addSearchToQuery, addFiltersToQuery } from '../filters_aggregation_helpers';
import { hydrateDb } from '../../../../../../internals/testing/backend/utils';
import { pokemon1 } from '../../../../../../internals/testing/backend/fixtures/datasets';


describe('Search and Filter Aggregation Helpers ', () => {
    let dataSourceDescription;
    let options;
    let aggregationOperators;

    beforeEach(async () => {
        dataSourceDescription = pokemon1;
        options = {};
        aggregationOperators = [];
        await hydrateDb();
    });

    it('should not add search or filters when not activated', () => {
        // Set these options to undefined and make sure that the returned agg operators length's are 0
        options.isSearchActive = undefined;
        options.isFilterActive = undefined;

        const searchAggs = addSearchToQuery(dataSourceDescription, options, aggregationOperators);
        const filterAggs = addFiltersToQuery(dataSourceDescription, options, aggregationOperators);

        expect(searchAggs).toHaveLength(0);
        expect(filterAggs).toHaveLength(0);
    });

    it('should return a built filter with filter args passed', () => {
        // Add filterObj and expect filterAggs to not be undefined
        options.isFilterActive = true;
        options.filterObj = { 'Type 1': 'Water' };

        const filterAggs = addFiltersToQuery(dataSourceDescription, options, aggregationOperators);

        expect(filterAggs).toMatchSnapshot();
    });

    it('should return a built filter with query args passed', () => {
        // Add filter column and query, and we should get something defined back 👌🏻
        options.isSearchActive = true;
        options.searchCol = 'All Fields';
        options.searchQ = 'Bulbasaur';

        const filterAggs = addSearchToQuery(dataSourceDescription, options, aggregationOperators);

        expect(filterAggs).toMatchSnapshot();
    });

    it('should throw an error with invalid filter params passed', () => {
        // Filter active is true, and crazy invalid filterObj
        options.isFilterActive = true;
        options.filterObj = { 55: [] };

        // Function to pass to the expect and get an error thrown
        const callAddFilters = () => {
            addFiltersToQuery(dataSourceDescription, options, aggregationOperators);
        };

        expect(callAddFilters).toMatchSnapshot();
    });

    it('should preserve order of aggregationOperators', () => {
        // Add filter column and query, and we should get something defined back in the proper order 👌🏻
        options.isSearchActive = true;
        options.searchCol = 'All Fields';
        options.searchQ = 'Bulbasaur';

        // Make some fake aggregationOperators to pass
        aggregationOperators = [{ fake_operator: ':)' }];

        const filterAggs = addSearchToQuery(dataSourceDescription, options, aggregationOperators);

        expect(filterAggs[0]['fake_operator']).toBe(':)');
        expect(filterAggs.length).toBeGreaterThan(1);
    });
});
