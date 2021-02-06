const winston = require('winston');

const { defaultPageSize } = require('../../../controllers/client/config');

module.exports = { addPagination };

function addPagination(req, res, next) {
    const viewType = req.camelCaseViewType;
    const pagination = {};

    pagination.limit = req.query.limit ? Number.parseInt(req.query.limit) : defaultPageSize(viewType);
    pagination.page = req.query.page !== 'null' ? req.query.page : 1;
    pagination.pageNumber = pagination.page ? Number.parseInt(pagination.page) : 1;
    pagination.skipNResults = pagination.limit * (Math.max(pagination.pageNumber, 1) - 1);
    pagination.onPageNum = pagination.pageNumber;
    pagination.resultsOffset = (pagination.pageNumber - 1) * pagination.limit;

    req.pagination = pagination;

    winston.debug('Added pagination');
    next();
}
