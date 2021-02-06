var winston = require('winston');

var importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');

module.exports.addImageMeta = function (req, res, next) {

    var dataSourceDescription = req.dataSource;
    var type = fallbackViewType(req.camelCaseViewType);

    var imageMeta = {};

    imageMeta.hasThumbs = dataSourceDescription.fe_image && dataSourceDescription.fe_image.field && dataSourceDescription.fe_image[type];
    imageMeta.scrapedImages = imageMeta.hasThumbs ? dataSourceDescription.fe_image.scraped : null;
    imageMeta.scrapedImageField = imageMeta.scrapedImages ? dataSourceDescription.fe_image.field : null;

    req.imageMeta = imageMeta;

    winston.debug('added imageMeta');
    next();
};

var fallbackViewType = function(view) {
    // Exception for displaying images in the table view
    // Images will only display if dataSourceDescription.fe_image[<view>]
    // Use gallery image setting temporarily until table becomes config option on dataSourceDescription.fe_image
    if (view === 'table') {
        return 'gallery';
    } else {
        return view;
    }
};
