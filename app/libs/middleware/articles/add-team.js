var winston = require('winston');

var Team = require('../../../models/teams');


module.exports.addTeam = function(req, res, next) {
    var subdomain = req.subdomains[0];

    Team.findOne({ subdomain: subdomain })
        .exec(function(err, team) {
            if (err || !team) {
                winston.error('Error finding team: ', err);
                return next(err || new Error('No team found'));
            } else {
                winston.debug('found team');
                req.team = team;
                next();
            }
        });
};
