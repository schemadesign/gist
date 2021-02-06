const winston = require('winston');

const {
    activeSearch_matchOp_orErrDescription,
    activeFilter_matchOp_orErrDescription_fromMultiFilter,
} = require('../../func');

module.exports = {
    addFiltersToQuery,
    addSearchToQuery,
};

/**
 * Helper to concat two arrays with the first being the original aggregation Operators
 * so that the correct order of the operators is not lost.
 * @param {Array<*>} aggregationOperators
 * @param {Array<*>} operatorsToAppend
 * @returns {Array<*>}
 */
const concatWithAggOperators = (aggregationOperators, operatorsToAppend) => aggregationOperators.concat(operatorsToAppend);

/**
 * Uses func.activeSearch_matchOp_orErrDescription to add the matchOps for a search.
 * Concats it to the given aggregationOperators and returns that or throws an error.
 * @param {Object} dataSourceDescription
 * @param {Object} options
 * @param {Object[]=} aggregationOperators
 * @returns {Object[]}
 * @throws {Error}
 */
function addSearchToQuery(dataSourceDescription, options, aggregationOperators = []) {
    // If the search is active, then add it to the query
    if (!options.isSearchActive) {
        return aggregationOperators;
    }

    const { err, matchOps } = activeSearch_matchOp_orErrDescription(dataSourceDescription, options.searchCol, options.searchQ);

    if (err) {
        throw Error(`Search not added to aggregation operators: ${err.message}`);
    }

    winston.debug('Search is active, adding to query');

    return concatWithAggOperators(aggregationOperators, matchOps);
}

/**
 * Uses func.activeFilter_matchOp_orErrDescription_fromMultiFilter to add the matchOps for given filter(s).
 * Concats it to the given aggregationOperators and returns that or throws an error.
 * @param {Object} dataSourceDescription
 * @param {Object} options
 * @param {Object[]=} aggregationOperators
 * @returns {Object[]}
 * @throws {Error}
 */
function addFiltersToQuery(dataSourceDescription, options, aggregationOperators = []) {
    // If there are active filters we'll want to add them to the query
    if (!options.isFilterActive) {
        return aggregationOperators;
    }

    const { err, matchOps } = activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, options.filterObj);

    if (err) {
        throw Error(`Filters not added to aggregation operators: ${err.message}`);
    }

    winston.debug('Filter is active, adding to query');

    return concatWithAggOperators(aggregationOperators, matchOps);
}
