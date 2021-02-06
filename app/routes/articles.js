var winston = require('winston');
var express = require('express');
var router = express.Router();

var addTeam = require('../libs/middleware/articles/add-team').addTeam;
var addPreview = require('../libs/middleware/articles/add-preview').addPreview;
var addWebsite = require('../libs/middleware/articles/add-website').addWebsite;
var addArticle = require('../libs/middleware/articles/add-article').addArticle;
var addAuthor = require('../libs/middleware/articles/add-author').addAuthor;
var addUser = require('../libs/middleware/views/add-user').addUser;


router.get('/:website/page/:article', addTeam, addPreview, addWebsite, addArticle, addAuthor, addUser, function (req, res, next) {

    var controller = require('../controllers/client/article.js');

    controller.BindData(req, function (err, bindData) {
        if (err) {
            winston.error('Error getting bind data for reform page, err: %s', err);
            return next(err);
        }

        if (!bindData.article) {
            return res.status(404).render('article/404', bindData);
        }

        return res.render('article/' + bindData.theme + '/index', bindData);
    });
});

module.exports = router;
