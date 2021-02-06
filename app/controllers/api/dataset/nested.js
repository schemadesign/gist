const winston = require('winston');
const { mapKeys } = require('lodash');

const fieldDelimiter = '_';
module.exports.fieldDelimiter = fieldDelimiter;

module.exports.replaceDot = obj => mapKeys(obj, (value, key) => key.replace(/\./g, fieldDelimiter));

// for Columns
// Returns array of nested paths with .property accessors
module.exports.getNestedFieldsWithPaths = function(columns) {
    let nestedFields = [];

    for (let i = 0; i < columns.length; i++) {
        const temp = columns[i];
        var sourceName = temp.sourceName;
        var sourceType = temp.sourceType;

        expandField(temp.sample, '', temp.name);
    }

    // Prevent ordinary properties from showing being added to the nested fields
    nestedFields = nestedFields.filter(function(field) {
        return field.path !== '';
    });

    function expandField(fieldSample, parentPath, fieldName) {
        if (fieldSample && (typeof fieldSample !== 'object' || typeof fieldSample.getMonth === 'function' || fieldSample instanceof Array)) {
        // Finish object traversal if sample is not an object
        // Also check for date because dates are also recognized as objects
        // https://stackoverflow.com/questions/643782/how-to-check-whether-an-object-is-a-date
        // Array indexes are recognized as object keys, do not traverse Arrays
            if (fieldName) {
                // nestedFields.push(parentPath + fieldName);
                // edge case: what if there are '.' in the fieldName?
                const fullReplacedPath = replaceDot(parentPath + fieldName);

                nestedFields.push({
                    path: parentPath,
                    displayName: fieldName,
                    name: fullReplacedPath,
                    // name: parentPath + fieldName,  // unable to save dot properties in mongo
                    sample: fieldSample,
                    sourceName: sourceName,
                    sourceType: sourceType
                });
            }

        } else {
            parentPath = parentPath + fieldName + '.';

            for (let key in fieldSample) {
                if (fieldSample.hasOwnProperty(key)) {
                    expandField(fieldSample[key], parentPath, key);
                }
            }
        }
    }

    return nestedFields;
};

// translate fields for dropdowns from sample doc
module.exports.translateNestedFields = function(source) {
    const rowParams = {};

    function expandField(sample, path, name) {
        const sampleExists = typeof sample !== 'undefined' && sample !== null;
        if ((sampleExists && typeof sample !== 'object') || (sampleExists && typeof sample.getMonth === 'function') || (sampleExists && sample instanceof Array)) {
        // Finish object traversal if sample is not an object
        // Also check for date because dates are also recognized as objects
        // https://stackoverflow.com/questions/643782/how-to-check-whether-an-object-is-a-date
        // Array indexes are recognized as object keys, do not traverse Arrays
            path += name;
            rowParams[path] = sample;

        } else {
            path = path + name + '.';

            for (let key in sample) {
                winston.debug('key', key);
                if (sample.hasOwnProperty(key)) {
                    expandField(sample[key], path, key);
                }
            }
        }
    }

    function translateNestedFieldsForObject(source) {
        for (let key in source) {
            expandField(source[key], '', key);
        }
        return rowParams;
    }

    return translateNestedFieldsForObject(source);
};

module.exports.removeObjectsFromColumns = function(columns) {
    for (let i = 0; i < columns.length; i++) {
        if (typeof columns[i].sample === 'object') {
            columns.splice(i, 1);
        }
    }
    return columns;
};
