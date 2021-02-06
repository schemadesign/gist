const { cond, get } = require('lodash');

const { GALLERY_STYLE_IMAGE, GALLERY_STYLE_ICON, GALLERY_STYLE_HEATMAP, VIEW_TYPE_GALLERY } = require('../../../../config/views.config');
const { calcContentColor, formatCoercedField } = require('../../func');
const { galleryItemHtmlWhenMissingImage, retrieveImageURLFromDoc, nestedImagePath } = require('./image.helpers');
const { equals } = require('../../../../utils/helpers');

module.exports = {
    processDocs,
};

/**
 * Calculates the item background color from the gallery view settings
 * @param {String} field
 * @param {Object} colorMapping
 * @param {Object} rowObject
 * @returns {Object}
 */
function galleryItemBackgroundColor({ field } = {}, colorMapping = {}, rowObject) {
    const fieldValue = rowObject.rowParams[field];

    if (colorMapping[fieldValue]) {
        return {
            backgroundColor: colorMapping[fieldValue],
            contentColor: calcContentColor(colorMapping[fieldValue]),
        };
    }

    return {
        backgroundColor: '#FFF',
        contentColor: '#CCC',
    };
}

/**
 * @param {Object[]} docs
 * @param {Object} dataSource
 * @param {String} viewName
 * @param {Object} viewSettings
 * @param {Object} options
 * @returns {Object[]}
 */
function processDocs(docs, dataSource, viewName = VIEW_TYPE_GALLERY, viewSettings, options) {
    const objectTitle = dataSource.objectTitle;
    const {
        galleryItemConditionsForIconWhenMissingImage,
        galleryItemConditionsForBackgroundColor,
        galleryStyle,
    } = viewSettings;

    docs.forEach((doc) => {
        doc.rowParams[objectTitle] = formatCoercedField(objectTitle, doc.rowParams[objectTitle], dataSource);
    });

    const sortBy = options.sortBy_realColumnName;
    if (sortBy !== objectTitle) {
        docs.forEach((doc) => {
            doc.rowParams[sortBy] = formatCoercedField(sortBy, doc.rowParams[sortBy], dataSource);
        });
    }

    // todo: lowercase all subdomains in the database and during creation of a new team
    const subdomain = dataSource._team.subdomain.toLowerCase();
    const bucket = process.env.DO_S3_BUCKET;
    const getPropertyFunctions = (doc) => ({
        getImage: () => ({
            nestedImagePath: nestedImagePath(doc, dataSource),
            scrapedImageUrl: retrieveImageURLFromDoc(bucket, subdomain, doc.pKey, dataSource._id, viewName, dataSource.updatedAt),
        }),
        getIcon: () => ({
            fe_galleryItem_htmlForIconFromRowObjWhenMissingImage: galleryItemHtmlWhenMissingImage(galleryItemConditionsForIconWhenMissingImage, doc, subdomain),
        }),
        getHeatmap: () => ({
            colors: galleryItemBackgroundColor(galleryItemConditionsForBackgroundColor, dataSource.colorMapping, doc),
        }),
    });
    const getGalleryProperties = (style, doc) => {
        const { getImage, getIcon, getHeatmap } = getPropertyFunctions(doc);
        return cond([
            [equals(GALLERY_STYLE_IMAGE), getImage],
            [equals(GALLERY_STYLE_ICON), getIcon],
            [equals(GALLERY_STYLE_HEATMAP), getHeatmap],
        ])(style);
    };

    docs.forEach((doc) => {
        const properties = getGalleryProperties(galleryStyle, doc);
        Object.assign(doc, properties);
    });

    return docs;
}
