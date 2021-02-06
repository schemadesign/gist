const winston = require('winston');

module.exports.addColFilter = (req, res, next) => {
    const query = req.query;

    const dataSourceDescription = req.dataSource;
    const views = dataSourceDescription.fe_views.views;

    const colFilter = {};

    colFilter.col = query.colFilter;
    colFilter.isColFilterActive = !!query.colFilter;

    req.colFilter = colFilter;

    // Add columns to filter menu if simple chart
    let viewTypeProp;
    let viewTypeDataProp;

    switch (req.viewType) {
        case 'bar-chart':
            viewTypeProp = 'barChart';
            viewTypeDataProp = 'bars';
            break;
        case 'line-graph':
            viewTypeProp = 'lineGraph';
            viewTypeDataProp = 'lines';
            break;
    }

    if (viewTypeProp && views[viewTypeProp].simpleChart && req.filter.uniqueFieldValuesByFieldName) {
        req.filter.uniqueFieldValuesByFieldName.unshift({ name: 'colFilter', values: views[viewTypeProp][viewTypeDataProp] });
    }

    winston.debug('added colFilter');
    next();
};
