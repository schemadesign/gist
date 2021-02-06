const winston = require('winston');

const { fieldOverrideIfExists } = require('../../../controllers/client/func');
const {
    HumanReadableFEVisibleColumnNames_orderedForDropdown,
    RealColumnNameFromHumanReadableColumnName,
} = require('../../../libs/datasources/imported_data_preparation');
const { getCoercionOperations } = require('./get-coercion-operations');
const { isDate, isNumber } = require('../../../controllers/client/config');

module.exports.addSortBy = function(req, res, next) {
    var query = req.query;
    var masterViewSettings = req.viewSettings;

    var dataSourceDescription = req.dataSource;
    var type = req.camelCaseViewType;
    var viewSettings = dataSourceDescription.fe_views.views[type];

    var sortBy = {};

    sortBy.sortBy = query.sortBy;

    sortBy.colNames_orderedForSortByDropdown = HumanReadableFEVisibleColumnNames_orderedForDropdown(
        dataSourceDescription,
        type,
        'SortBy',
        getCoercionOperations('defaultSortByColumnName', masterViewSettings)
    );
    sortBy.colNames_orderedForDisplayTitleDropdown = HumanReadableFEVisibleColumnNames_orderedForDropdown(
        dataSourceDescription,
        type,
        'TileDisplay',
        getCoercionOperations('secondaryColumnTileDisplay', masterViewSettings)
    );

    const sortByField = sortBy.sortBy || viewSettings.defaultSortByColumnName;
    sortBy.sortBy_realColumnName = RealColumnNameFromHumanReadableColumnName(sortByField, dataSourceDescription);

    sortBy.isDate = isDate(dataSourceDescription, sortBy.sortBy_realColumnName);
    sortBy.isNumber = isNumber(dataSourceDescription, sortBy.sortBy_realColumnName);

    sortBy.sortDirection = query.sortDirection;
    sortBy.defaultSortByColumnName_humanReadable = fieldOverrideIfExists(
        viewSettings.defaultSortByColumnName,
        dataSourceDescription
    );
    sortBy.defaultSortOrderDescending = viewSettings.defaultSortOrderDescending;

    sortBy.defaultAxisSort = viewSettings.defaultAxisSort;

    req.sortBy = sortBy;

    winston.debug('added sortBy');
    next();
};
