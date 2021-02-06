const winston = require('winston');
const { isArray } = require('lodash');

const { groupSizes } = require('../../../controllers/client/config');

module.exports = { addGroupSize };

async function addGroupSize(req, res, next) {
    const type = req.camelCaseViewType;
    const query = req.query;
    const dataSourceDescription = req.dataSource;
    const viewSettings = dataSourceDescription.fe_views.views[type];
    const extractGroupSize = groupSize => isArray(groupSize) ? groupSize[viewSettings.largeTilesWithCaptions ? 1 : 0] : groupSize;

    const queriedGroupSize = query.groupSize ? Number.parseInt(query.groupSize) : null;

    req.groupSize = queriedGroupSize || extractGroupSize(groupSizes[type]) || -1;

    winston.debug('Added groupSize');
    next();
}
