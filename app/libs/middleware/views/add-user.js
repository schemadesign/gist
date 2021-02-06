var winston = require('winston');

var User = require('../../../models/users');

module.exports.addUser = function (req, res, next) {
    if (req.user) {
        User.findById(req.user)
            .populate('defaultLoginTeam')
            .exec(function (err, doc) {
                if (err) {
                    winston.error('Error finding user: ', err);
                    return next(err);
                }
                req.populatedUser = doc;

                winston.debug('found user and populated with default login team');
                next();
            });
    } else {
        // @todo: introduce anonymous user?
        req.populatedUser = null;

        winston.debug('anonymous user');
        next();
    }
};
