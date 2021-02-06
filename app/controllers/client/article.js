var winston = require('winston');
const { equals, isEmbed } = require('../../utils/helpers');


module.exports.BindData = function (req, callback) {
    const urlBase = `${req.protocol}://${req.get('host')}`;
    const href = `${urlBase}${req.originalUrl}`;

    const data = {
        article: req.article,
        website: req.website,
        team: req.team,
        author: req.author,
        user: req.populatedUser,
        theme: 'default',
        currentUrl: href,
        urlBase,
        previewTail: req.preview ? '?preview=true' : '',
        isPreview: req.preview,
        env: process.env,
        isEmbed: isEmbed(req.query),
        has_google_analytics: req.team.google_analytics,
        google_analytics_id: req.team.google_analytics
    };

    winston.info('returning article data');

    callback(null, data);
};
