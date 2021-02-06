var winston = require('winston');
const { isEmbed } = require('../../utils/helpers');

var dataSourceDescriptions = require('../../models/descriptions');

module.exports.ensureAuthorized = function (req, res, next) {
    // Ensure the user is authorized to the dataset
    dataSourceDescriptions.GetDatasourceByUserAndKey(req.user, req.sourceKey, req.revision, req.overrideAuth, function (err, dataSource) {
        if (err) {
            winston.error('Error getting bind data to authorizing: ', err);
            return next(err);
            // return res.status(500).send(err.response || 'Internal Server Error');
        }

        if (!dataSource) {
            let message = 'This visualization either no longer exists, or is set to private.';
            let err = '';
            const isEmbedded = isEmbed(req.query);

            if (isEmbedded) {
                err += ` If you have access to the visualization settings
                    you can set the view to public by navigating to Privacy Settings under Display Settings.
                    Turn on Allow anyone to view visualization.`;
            }
            return res.render('error', {
                env: process.env,
                title: 'Visualization not available',
                message: message,
                err: err,
                hideLinks: isEmbedded,
                has_google_analytics: !!process.env.GOOGLE_ANALYTICS_ID,
            });
        }

        req.dataSource = dataSource;

        winston.debug('user is authorized to view dataSource');
        next();
    });
};

module.exports.ensureAuthorizedLegacy = function (req, res, next) {
    // Ensure the user is authorized to the dataset
    var sourceKey;
    if (typeof req.params.source_key === 'undefined') {
        sourceKey = req.params[0];
        sourceKey = process.env.NODE_ENV === 'enterprise' ? sourceKey.substring(1) : `${req.subdomains[0]}:${sourceKey.substring(1)}`;
    } else {
        sourceKey = process.env.NODE_ENV === 'enterprise' ? req.params.source_key : `${req.subdomains[0]}:${req.params.source_key}`;
    }

    sourceKey = sourceKey.replace(/_/g, '-');

    var revision;
    if (req.query && req.query.revision) {
        revision = req.query.revision;
    }

    dataSourceDescriptions.GetDatasourceByUserAndKey(req.user, sourceKey, revision, req.overrideAuth, function (err, datasource) {
        if (err) {
            winston.error('Error getting bind data to authorizing: ', err);
            return next(err);
        }

        if (!datasource) {
            return res.redirect('/');
        }

        winston.debug('user is authorized to view datasource');
        next();
    });
};
