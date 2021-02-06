const winston = require('winston');
const _ = require('lodash');

const {
    filterObjFromQueryParams,
    new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill,
} = require('../../../controllers/client/func');
const {
    addDefaultFilters,
    topUniqueFieldValuesForFiltering,
} = require('../../../controllers/client/data_preparation/data_prep_helpers/filters_helpers');

module.exports.addFilter = function (req, res, next) {
    const query = req.query;
    const dataSourceDescription = req.dataSource;
    const filter = {};

    if (query.defaultFilters) {
        Object.assign(query, dataSourceDescription.fe_filters.default);
    }

    filter.filterObj = filterObjFromQueryParams(query);

    if (req.preview.isPreview) {
        req.filter = filter;
        return next();
    }

    // Obtain Top Unique Field Values For Filtering
    topUniqueFieldValuesForFiltering({
        dataSourceDescription,
        filterObj: filter.filterObj,
    }, function (err, _uniqueFieldValuesByFieldName) {
        if (err) {
            winston.error('Error: ', err);
            return next(err, null);
        }

        addDefaultFilters(dataSourceDescription, _uniqueFieldValuesByFieldName);

        filter.uniqueFieldValuesByFieldName = _uniqueFieldValuesByFieldName;
        filter.truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill = new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill(dataSourceDescription);
        filter.defaultFilterObj = dataSourceDescription.fe_filters.default || {};
        filter.isFilterActive = !_.isEmpty(filter.filterObj);
        req.filter = filter;

        winston.debug('added filter');
        next();
    });
};
