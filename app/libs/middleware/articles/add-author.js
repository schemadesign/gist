var winston = require('winston');

var User = require('../../../models/users');

module.exports.addAuthor = function(req, res, next) {

    // Skip finding author if no article was found
    if (!req.article || req.article === null) {
        return next(); // Stop execution here
    }

    var userId = req.article.createdBy;

    User.findOne({ _id: userId }).exec(function(err, author) {
        if (err) {
            winston.error('Error finding author of article: ', err);
            return next(err);
        } else {
            winston.debug('found author of article');
            req.author = author;
            next();
        }
    });

};
