const winston = require('winston');
const { defaultTo } = require('lodash');


module.exports.addCdn = function (req, res, next) {
    const { cdnAddress } = req.query;

    req.cdnAddress = defaultTo(cdnAddress, '');

    winston.debug('added cdn');
    next();
};
