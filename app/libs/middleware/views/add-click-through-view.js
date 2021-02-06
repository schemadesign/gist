const winston = require('winston');
const { determineClickThroughView } = require('../../../controllers/client/view.helpers');

module.exports = { addClickThroughView };

function addClickThroughView(req, res, next) {
    req.clickThroughView = determineClickThroughView(req.viewType, req.dataSource.fe_views.views);

    winston.debug('added click through view');
    next();
}
