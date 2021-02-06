const winston = require('winston');

module.exports = { addInstanceId };

function addInstanceId(req, res, next) {
    const { instanceId } = req.query;
    const dataSource = req.dataSource;

    req.viewInstanceId = instanceId || dataSource._id.toString();
    req.isCustomInstance = !!instanceId;

    winston.debug('Added instance id');
    next();
}
