var winston = require('winston');

var Website = require('../../../models/websites');


module.exports.addWebsite = function(req, res, next) {
    var teamId = req.team._id;
    var findQuery = {
        team: teamId,
        slug: req.params.website
    };

    Website.findOne(findQuery)
        .exec(function(err, website) {
            if (err || !website) {
                winston.error('Error finding website: ', err);
                return next(err || new Error('No website found'));
            } else {
                winston.debug('found website');
                req.website = website;
                next();
            }
        });
};
