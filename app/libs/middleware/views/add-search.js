var winston = require('winston');

var importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');

module.exports.addSearch = function (req, res, next) {
    var query = req.query;

    var dataSourceDescription = req.dataSource;

    var search = {};

    search.cols_orderedForSearchByDropdown = importedDataPreparation.HumanReadableFEVisibleColumnNames_orderedForSearchByDropdown(dataSourceDescription);

    search.searchCol = query.searchCol;
    search.searchQ = query.searchQ;
    search.isSearchActive = typeof search.searchCol !== 'undefined' && search.searchCol != null && search.searchCol != '' && // Not only a column
        typeof search.searchQ !== 'undefined' && search.searchQ != null && search.searchQ != ''; // but a search query
    req.search = search;

    winston.debug('added search');
    next();
};
