const winston = require('winston');
const { cond, constant, stubTrue } = require('lodash');

const { addNonFilterQueryToUrl } = require('./../../../controllers/client/func');

module.exports = { addRoutePathBase };

function addRoutePathBase(req, res, next) {
    const { viewType, params: { shared_page_id, source_key }, query } = req;

    const getRoutePath = cond([
        [constant(shared_page_id), constant(`/s/${shared_page_id}`)],
        [constant(viewType), constant(`/${source_key}/${viewType}`)],
        [stubTrue, constant(`/${source_key}`)],
    ]);

    const routePath = getRoutePath();

    req.routePath_base = addNonFilterQueryToUrl(query, routePath);

    winston.debug('Added routePathBase');
    next();
}
