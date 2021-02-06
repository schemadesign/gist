const { findDataset } = require('../controllers/api/dataset/get-helpers');
const { some, includes } = require('lodash');
const DATA_SOURCE_TYPES = require('../../config/data-source-types');

module.exports.getDataset = getDataset;
module.exports.hasValidDatasetSource = hasValidDatasetSource;

/**
 * @param {String|ObjectId} id
 * @returns {Promise<Object>}
 */
async function getDataset(id) {
    const { description } = await findDataset({ id });

    return description;
}

/**
 * Determins if the datasourceDescription passed has a valid dataset source
 * determined from the list in config/data-source-types.js
 * @param {Object} datasourceDescription
 * @returns {Boolean}
 */
function hasValidDatasetSource(datasourceDescription) {
    return some(datasourceDescription, (value, key) => {
        return includes(DATA_SOURCE_TYPES, key);
    });
}
