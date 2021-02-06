const winston = require('winston');

const { fieldOverrideIfExists } = require('../../../controllers/client/func');
const { RealColumnNameFromHumanReadableColumnName } = require('../../../libs/datasources/imported_data_preparation');

module.exports = { addSecondaryCol };

function addSecondaryCol(req, res, next) {
    const {
        dataSource,
        query: { secondaryCol: queriedSecondaryCol },
        camelCaseViewType: viewType,
    } = req;

    const secondaryCol = {
        secondaryCol: undefined,
        secondaryColumnTileDisplay: undefined,
        secondaryColumnTileShow: undefined,
    };

    // TODO: this needs to be fleshed out more to properly show the rewritten column name
    // and allow for specifying the query secondaryCol as the original column name or
    // "human readable" column name, similarly to groupBy, aggregateBy, etc.
    // This mimics the existing behavior as a first pass though.

    // TODO: currently only for gallery... we don't have a great way yet to opt in to certain middleware by view in the
    // page render middleware chain
    if (viewType === 'gallery') {
        secondaryCol.secondaryCol = dataSource.fe_views.views[viewType].secondaryColumnTileDisplay;
        secondaryCol.secondaryColumnTileShow = dataSource.fe_views.views[viewType].secondaryColumnTileShow;
        secondaryCol.secondaryColumnTileDisplay = fieldOverrideIfExists(dataSource.fe_views.views[viewType].secondaryColumnTileDisplay, dataSource);
    }

    if (queriedSecondaryCol && queriedSecondaryCol !== 'undefined') {
        secondaryCol.secondaryCol = RealColumnNameFromHumanReadableColumnName(queriedSecondaryCol, dataSource);
        secondaryCol.secondaryColumnTileDisplay = queriedSecondaryCol;
    }

    req.secondaryCol = secondaryCol;

    winston.debug('Added secondaryCol');
    next();
}
