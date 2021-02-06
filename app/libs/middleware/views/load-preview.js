var winston = require('winston');

var importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');

module.exports.loadPreview = function (req, res, next) {

    var query = req.query;

    var preview = {
        isPreview: false,
    };

    var source_pKey = req.params.source_key;
    var collectionPKey = process.env.NODE_ENV === 'enterprise' ? source_pKey : `${req.subdomains[0]}:${source_pKey}`;

    if (query.preview && query.preview === 'true') {
        importedDataPreparation.DataSourceDescriptionWithPKey(true, collectionPKey, req.revision)
            .then(function (dataSource) {
                req.dataSource = dataSource;
                preview.isPreview = true;
                req.preview = preview;
                winston.debug('loaded preview');
                next();
            }).catch(function (err) {
                if (err) {
                    req.preview = preview;
                    winston.error('cannot load preview, error: ', err);
                    return next(err, null);
                } else {
                    req.preview = preview;
                    winston.error('unknown error attempting to load preview');
                    return next(new Error('Unknown error attempting to load preview'));
                }
            });
    } else {
        req.preview = preview;
        winston.debug('not a preview, skipping loading preview');
        next();
    }
};
