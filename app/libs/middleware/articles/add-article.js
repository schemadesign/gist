var winston = require('winston');

var Page = require('../../../models/pages');


module.exports.addArticle = function(req, res, next) {
    var teamId = req.team._id;
    var websiteId = req.website._id;
    var findQuery = {
        team: teamId,
        website: websiteId,
        slug: req.params.article
    };

    if (!req.preview) {
        findQuery.published = true;
    }

    Page.findOne(findQuery)
        .exec(function(err, article) {
            if (err) {
                winston.error('Error finding page: ', err);
                return next(err);
            } else {
                winston.debug('found article');
                req.article = article;
                next();
            }
        });

};
