const { findIndex, isArray, isEmpty, has, toString } = require('lodash');
const NOT_SPECIFIED = 'not-specified-value';

module.exports = {
    checkConditionAndApplyClasses,
    galleryItemHtmlWhenMissingImage,
    retrieveImageURLFromDoc,
    nestedImagePath,
};

/**
 * Function to check a given conditions to a given value, and return the correct html.
 * Can return either a saved team icon, or one of the Gist defauls.
 * @param {String} subdomain
 * @param {Object[]} conditions
 * @param {String} value
 * @returns {String}
 */

function checkConditionAndApplyClasses(subdomain, conditions = [], rawValue) {
    const strValue = isEmpty(rawValue) ? NOT_SPECIFIED : toString(rawValue);
    const url = `https://${process.env.DO_S3_BUCKET}.${process.env.DO_S3_ENDPOINT}/${subdomain}`;

    const condition = conditions.find(({ value, applyIconFromUrl, applyClass }) => {
        if (strValue !== value) {
            return false;
        }

        return applyIconFromUrl || applyClass;
    });

    if (!condition) {
        return '';
    }

    const { applyIconFromUrl, applyClass } = condition;

    if (applyIconFromUrl) {
        const src = applyIconFromUrl.startsWith('/images') ? applyIconFromUrl : `${url}${applyIconFromUrl}`;

        return `<div class="gist-icon-tile-wrapper"><img class="gist-icon-tile" src="${src}" alt="Image of ${strValue}"></div>`;
    }

    if (applyClass) {
        // hard coded color-gender, as it is the only default icon category for now
        return `<span class="gist-icon-tile ${applyClass} color-gender"></span>`;
    }

    return '';
}

/**
 * If there is a rule to use icons in the gallery tiles, this function should be called on every rowObject
 * to return the html for the icons.
 * @param {Object} galleryShowIconsWithNoImage
 * @param {Object} rowParams
 * @param {String} subdomain
 * @returns {String}
 */
function galleryItemHtmlWhenMissingImage(galleryShowIconsWithNoImage = {}, { rowParams }, subdomain) {
    const { field, conditions } = galleryShowIconsWithNoImage;
    const fieldValue = rowParams[field];
    let htmlElem = '';

    if (isArray(fieldValue)) {
        if (!fieldValue.length) {
            const index = findIndex(conditions, ({ value }) => value === NOT_SPECIFIED);

            if (index !== -1) {
                return checkConditionAndApplyClasses(subdomain, conditions, NOT_SPECIFIED);
            }
        }

        for (let i = 0; i < fieldValue.length; i++) {
            // Get the image html (if any)
            htmlElem = checkConditionAndApplyClasses(subdomain, conditions, fieldValue[i]);

            // If there was a result
            if (htmlElem) {
                break;
            }
        }
    } else {
        htmlElem = checkConditionAndApplyClasses(subdomain, conditions, fieldValue);
    }

    return htmlElem;
}

/**
 * @param {String} bucket
 * @param {String} subdomain
 * @param {String} docPKey
 * @param {String} datasetId
 * @param {String} viewType
 * @param {String?} updatedAt
 * @returns {String}
 */
function retrieveImageURLFromDoc(bucket, subdomain, docPKey, datasetId, viewType, updatedAt) {
    return `http${process.env.USE_SSL === 'true' ? 's' : ''}://${process.env.HOST}/api/s3/${subdomain}/datasets/${datasetId}/assets/images/${viewType}/${docPKey}${updatedAt ? `?updatedAt=${updatedAt}` : ''}`;
}

/**
 * @param {Object} rowParams
 * @param {Object} fe_image
 * @returns {Object|String|null}
 */
function nestedImagePath({ rowParams }, { fe_image }) {
    if (!fe_image.field) {
        return null;
    }

    const fieldKeys = fe_image.field.split('.');
    let image = rowParams;

    fieldKeys.forEach((key) => {
        if (has(image, key)) {
            image = image[key];
        }
    });

    return image;
}
