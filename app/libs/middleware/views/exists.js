const winston = require('winston');
const { get } = require('lodash');

module.exports = { exists };

function exists(req, res, next) {
    const dataSource = req.dataSource;
    const type = req.camelCaseViewType;

    if (!get(dataSource.fe_views, ['views', type, 'visible'])) {
        const query = JSON.stringify(req.query, null, '\t');
        const params = JSON.stringify(req.params);
        const error = new Error(`View doesn't exist for dataset. UID? query: ${query} Params: ${params}`);

        winston.error('Error getting view for dataSource', error);
        return next(error, null);
    }

    winston.debug('View exists for dataSource');
    next();
}
