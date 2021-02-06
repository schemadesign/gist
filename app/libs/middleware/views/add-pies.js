const winston = require('winston');
const _ = require('lodash');

const { fieldOverrideIfExists } = require('../../../controllers/client/func');

module.exports.addPies = (req, res, next) => {
    const dataSourceDescription = req.dataSource;
    const type = req.camelCaseViewType;
    const pieTitles = [];

    _.each(dataSourceDescription.fe_views.views[type].pies, (pie) => {
        pieTitles.push({
            realName: pie,
            humanReadable: fieldOverrideIfExists(pie, dataSourceDescription),
        });
    });

    req.pies = pieTitles;
    req.simpleChart = dataSourceDescription.fe_views.views[type].simpleChart;

    winston.debug('added pies');
    next();
};
