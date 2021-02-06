const { flow, map, sortBy, defaultTo, pickBy, get, omit, kebabCase, concat } = require('lodash');

const OBJECT_TITLE = 'Object Title';

module.exports = {
    OBJECT_TITLE,
};

var _dataSourceDescriptionWithPKey = function (preview, source_pKey, revision) {
    let subdomain = null;
    let uid;

    if (process.env.NODE_ENV === 'enterprise') {
        uid = source_pKey;
    } else {
        [subdomain, uid] = source_pKey.split(':');

        if (!uid) {
            return Promise.reject('Invalid source_pKey: expected format: \'subdomain:uid\'. Check if NODE_ENV should be \'enterprise\'.');
        }
    }

    uid = uid.replace(/_/g, '-');

    return new Promise(function (resolve, reject) {
        const dataSourceDescriptions = require('../../models/descriptions');
        dataSourceDescriptions.GetDescriptionsWith_subdomain_uid_importRevision(preview, subdomain, uid, revision, function (err, data) {
            if (err) {
                return reject(err);
            }
            resolve(data);
        });
    });
};

module.exports.DataSourceDescriptionWithPKey = _dataSourceDescriptionWithPKey;

function _realColumnNameFromHumanReadableColumnName(humanReadableColumnName, dataSourceDescription) {
    if (humanReadableColumnName === OBJECT_TITLE) {
        return dataSourceDescription.objectTitle;
    }

    var fe_displayTitleOverrides = dataSourceDescription.fe_displayTitleOverrides || {};
    var originalKeys = Object.keys(fe_displayTitleOverrides);
    var originalKeys_length = originalKeys.length;

    for (var i = 0; i < originalKeys_length; i++) {
        var originalKey = originalKeys[i];
        var overrideTitle = fe_displayTitleOverrides[originalKey];
        if (overrideTitle === humanReadableColumnName) {
            return originalKey;
        }
    }

    return humanReadableColumnName;
}

module.exports.RealColumnNameFromHumanReadableColumnName = _realColumnNameFromHumanReadableColumnName;

/**
 * Returns column descriptions ({ name, operation, ... })
 * > without excluded values
 * > with display title
 * > sorted by fe_fieldDisplayOrder and alphabetically
 * @param datasourceDescription datasource description object
 */
const prepareColumns = ({
    raw_rowObjects_coercionScheme = {},
    fe_excludeFields = {},
    fe_fieldDisplayOrder = [],
    fe_displayTitleOverrides = {},
    customFieldsToProcess = [],
    relationshipFields = [],
}) => {
    const columnsFromCoercionScheme = flow(
        coercionScheme => pickBy(coercionScheme, (value, name) => !fe_excludeFields[name]),
        coercionScheme => map(coercionScheme, (data, name) => ({
            ...data,
            name: defaultTo(fe_displayTitleOverrides[name], name),
            originalName: name,
        })),
    )(raw_rowObjects_coercionScheme);

    const columnsFromCustomFields = customFieldsToProcess
        .filter(({ fieldName }) => !fe_excludeFields[fieldName])
        .map(({ fieldName }) => ({
            name: defaultTo(fe_displayTitleOverrides[fieldName], fieldName),
            originalName: fieldName,
            operation: 'ToString',
        }));

    const columnsFromRelationshipFields = relationshipFields
        .filter(({ field }) => !fe_excludeFields[field])
        .map(({ field }) => ({
            name: defaultTo(fe_displayTitleOverrides[field], field),
            originalName: field,
        }));

    const getColumnDisplayOrderNumber = (column) => {
        const displayOrderNumber = fe_fieldDisplayOrder.indexOf(column.originalName);

        return displayOrderNumber === -1 ? Infinity : displayOrderNumber;
    };

    return sortBy(
        concat(columnsFromCoercionScheme, columnsFromCustomFields, columnsFromRelationshipFields),
        [getColumnDisplayOrderNumber, 'name'],
    );
};

const pickColumnName = column => column.name;
const omitColumnOriginalName = column => omit(column, ['originalName']);

module.exports.HumanReadableFEVisibleColumns = (dataSourceDescription) => {
    return prepareColumns(dataSourceDescription);
};

module.exports.HumanReadableFEVisibleColumnNames = (dataSourceDescription) => {
    return prepareColumns(dataSourceDescription).map(pickColumnName);
};

module.exports.HumanReadableFEVisibleColumnNames_orderedForSearchByDropdown = (dataSourceDescription) => {
    return [
        { name: 'All Fields', operation: 'toString' },
        ...prepareColumns(dataSourceDescription).map(omitColumnOriginalName),
    ];
};

module.exports.HumanReadableFEVisibleColumnNames_orderedForDropdown = (dataSourceDescription, viewType, dropdown, restrictFieldType) => {
    const unavailableFields = get(dataSourceDescription.fe_views, ['views', viewType, `fieldsNotAvailableAs${dropdown}Columns`], []);

    return prepareColumns(dataSourceDescription)
        .filter(({ operation, originalName }) => (
            !unavailableFields.includes(originalName) &&
            (!restrictFieldType || restrictFieldType === operation || restrictFieldType.includes(operation))
        ))
        .map(pickColumnName);
};

function _dataSourceUIDFromTitle(title) {
    if (!title) {
        return new Error('Title is not provided!');
    }

    return kebabCase(title);
}

module.exports.DataSourceUIDFromTitle = _dataSourceUIDFromTitle;
