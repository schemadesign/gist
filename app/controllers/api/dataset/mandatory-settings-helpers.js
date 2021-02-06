const _ = require('lodash');
const nested = require('./nested');
const { mandatorySettings } = require('../../../../config/mandatory-settings');

/**
 * returns true if sample is an object or array first element is object
 * used for determining whether field is nested
 * @param {Object} sample
 * @return {bool}
 */
function nestedObject(sample) {
    const sampleElement = _.isArray(sample) ? sample[0] : sample;
    return _.isPlainObject(sampleElement) && !_.isEmpty(sampleElement);
}

module.exports.nestedObject = nestedObject;

/**
 * loop through applicable objects. If none are found and the loop started at an index greater than 0, reset the index
 * to 0 and try again.
 *
 * @param {Number} index
 * @param {array} applicableObjects
 * @return {String} returns the applicable object name or null
 */
function loopThroughApplicableObjects(index, applicableObjects) {
    for (let i = index; i < applicableObjects.length; i++) {
        return applicableObjects[i];
    }

    if (index === 0) {
        return null;
    } else {
        return loopThroughApplicableObjects(0, applicableObjects);
    }
}

/**
 * Sort columnNames based on the order of fieldDisplayOrder. Assumes fieldDisplayOrder is a superset of columnNames,
 * and only returns a mutated array if that's the case.
 * @param  {Array} columnNames       - array of columnNames, originally derived from raw_rowObjects_coercionScheme
 * @param  {Array} fieldDisplayOrder - superset of columnNames with the desired sorting
 * @return {Array}                   - properly sorted columnNames
 */
function sortByFieldDisplayOrder(columnNames, fieldDisplayOrder) {
    let originalColumnNames = _.clone(columnNames);
    // We can use _.intersection to sort columnNames according to fieldDisplayOrder
    // because the sort order is determined by the first array
    // and fieldDisplayOrder (i.e. dataset.fe_fieldDisplayOrder) should be the superset of all columnNames
    if (fieldDisplayOrder && fieldDisplayOrder.length > 0) {
        let newColumnNames = _.intersection(fieldDisplayOrder, originalColumnNames);
        // just in case, we'll check the equality (regardless of order) of the two arrays before returning
        if (_.isEqual(originalColumnNames.slice().sort(), newColumnNames.slice().sort())) {
            return newColumnNames;
        }
    }
    return originalColumnNames;
}

/**
 * returns error message for a given view
 * @param {String} viewName
 * @return {String}
 */
function viewUnavailableMessage(viewName) {
    switch (viewName) {
        case 'scatterplot':
            return 'Your data must contain at least two number fields to display the Scatterplot.';
        case 'bubbleChart':
            return 'Your data must contain at least one number field, a date field, and a text field to display the bubble chart.';
        case 'wordCloud':
            return 'You must add keywords to your Word Cloud before it can be displayed.';
        case 'lineGraph':
            return 'Your data must contain at least one number field to display the line graph';
        case 'regionalMap':
            return 'Your data must contain at least one number field to display the regional map';
        case 'areaChart':
            return 'Your data must contain at least one number field to display the area chart.';
    }
}

/**
 * return non-nested columns and columns that meet the setting restriction
 *
 * @param {Object} rowObjects
 * @param {Array} nestedObjectNames
 * @param {Object<Boolean>}excludeFields
 * @param {Array} restriction
 * @return {Array}
 */
const obtainApplicableColumns = (rowObjects, nestedObjectNames, excludeFields, restriction) => {
    // narrow by JSON nested objects and excluded fields
    // don't automatically set nested objects
    //TODO what if all the columns are nested?
    let applicableRowObjects = _.omitBy(rowObjects, (value, key) => {
        return nestedObjectNames.indexOf(key) >= 0 || excludeFields[key] === true;
    });

    if (restriction) {
        applicableRowObjects = _.omitBy(applicableRowObjects, (value) => {
            return restriction.indexOf(value.operation) === -1;
        });
    }
    return Object.keys(applicableRowObjects);
};

/**
 * loops through mandatory settings and applies fields to them
 * @param {Array} columns
 * @param {Object} rowObjects
 * @param {Array} fieldDisplayOrder
 * @param {Object} chartSettings
 * @param {Object<Boolean>} excludeFields
 * @param {Object} existingViewSettings
 * @param {String} viewName
 * @return {Object}
 */
function setDefaultsIfNoneExist(columns, rowObjects, fieldDisplayOrder, chartSettings = {}, excludeFields, existingViewSettings, viewName) {
    let columnNames;
    // TODO: separate this logic once nested fields branch is merged
    // save a record of all the nested JSON objects
    const nestedObjectNames = [];

    _.each(columns, (column) => {
        if (nestedObject(column.sample)) {
            nestedObjectNames.push(column.name);
        }
    });

    // keep track of index to try to avoid duplication of column names in the settings
    let index = -1;

    /**
     * loops through settings and assigns value or error message if null
     *
     * @param {Object} settings - base or additional settings for a chart
     * @param {Boolean} areaBaseSettings - whether or not the settings are base settings
     * @return {Object}
     */
    const assignSettingValues = (settings, areaBaseSettings) => {
        _.each(settings, ({ setting, restriction, multiSelect, optional }) => {
            index++;
            let settingValue;
            // if nothing has been applied to the setting yet
            if (!existingViewSettings.hasOwnProperty(setting) || excludeFields[existingViewSettings[setting]]) {
                columnNames = obtainApplicableColumns(rowObjects, nestedObjectNames, excludeFields, restriction);
                columnNames = sortByFieldDisplayOrder(columnNames, fieldDisplayOrder);
                settingValue = loopThroughApplicableObjects(index, columnNames);
                if (settingValue !== null) {
                    if (multiSelect) {
                        existingViewSettings[setting] = [settingValue];
                    } else {
                        existingViewSettings[setting] = settingValue;
                    }
                }
            }
            // if nothing matched the base setting requirements
            if (!optional && !existingViewSettings.hasOwnProperty(setting) && areaBaseSettings && existingViewSettings.visible) {
                existingViewSettings.visible = false;
                existingViewSettings.message = viewUnavailableMessage(viewName);
            }
        });
    };

    // first determine the base settings
    assignSettingValues(chartSettings.baseSettings, true);

    if (existingViewSettings.visible) {
        // then the additional settings
        assignSettingValues(chartSettings.additionalSettings, false);
    }

    return existingViewSettings;
}

module.exports.setDefaultsIfNoneExist = setDefaultsIfNoneExist;

/**
 * loops through views
 * for each view, assigns mandatory settings, calls set default settings function then modifies the updateQuery
 * @param {Array} columns
 * @param {Object} coercionSchemeColumnNames
 * @param {Array} fieldDisplayOrder
 * @param {Object<Boolean>} excludeFields
 * @param {Object} updateQuery
 * @param {Object} value - expected to have first level property, "views"
 * @return {Object}
 */
const determineMandatorySettings = (columns, coercionSchemeColumnNames, fieldDisplayOrder, excludeFields, updateQuery, value) => {
    const returnObject = {};

    _.forOwn(value.views, (viewSettings, viewName) => {
        const { message, ...viewSettingsQuery } = setDefaultsIfNoneExist(columns, coercionSchemeColumnNames, fieldDisplayOrder, mandatorySettings[viewName], excludeFields, viewSettings, viewName);

        _.set(updateQuery, ['$set', 'fe_views', 'views', viewName], viewSettingsQuery);

        if (message) {
            returnObject.message = message;
        }
    });

    // Fix a problem with removing this property from the database
    updateQuery.$set.fe_views.default_view = value.default_view;

    returnObject.updateQuery = updateQuery;

    return returnObject;
};
module.exports.determineMandatorySettings = determineMandatorySettings;
