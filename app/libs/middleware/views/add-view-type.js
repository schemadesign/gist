const winston = require('winston');

const { VIEW_TYPES } = require('../../../../config/view-types');

module.exports = { addViewType };

function addViewType(req, res, next) {
    const { query: { viewType } } = req;

    if (!VIEW_TYPES.includes(viewType)) {
        return next();
    }

    req.viewType = viewType;

    winston.debug(`Added view type: ${viewType}`);
    next();
}
