// legacy
const { cond, constant, eq, kebabCase, stubTrue } = require('lodash');

const {
    VIEW_TYPE_BAR_CHART,
    VIEW_TYPE_PIE_SET,
    VIEW_TYPE_SCATTERPLOT,
    VIEW_TYPE_TIMELINE,
    VIEW_TYPE_TREEMAP,
} = require('../../config/views.config');

const PAGE_SIZE_BAR_CHART = 1000;
const PAGE_SIZE_PIE_SET = 50;
const PAGE_SIZE_SCATTERPLOT = 1000;
const PAGE_SIZE_TIMELINE = 20;
const PAGE_SIZE_TREEMAP = 1000;
const PAGE_SIZE_DEFAULT = 200;

function defaultPageSize(type) {
    const equals = a => b => eq(a, b);

    return cond([
        [equals(VIEW_TYPE_BAR_CHART), constant(PAGE_SIZE_BAR_CHART)],
        [equals(VIEW_TYPE_PIE_SET), constant(PAGE_SIZE_PIE_SET)],
        [equals(VIEW_TYPE_SCATTERPLOT), constant(PAGE_SIZE_SCATTERPLOT)],
        [equals(VIEW_TYPE_TIMELINE), constant(PAGE_SIZE_TIMELINE)],
        [equals(VIEW_TYPE_TREEMAP), constant(PAGE_SIZE_TREEMAP)],
        [stubTrue, constant(PAGE_SIZE_DEFAULT)],
    ])(type);
}

const numberOperations = ['ToInteger', 'ToFloat', 'ToPercent', 'ToCurrency'];

const groupSizes = {
    timeline: [19, 11],
    pieSet: 50,
};
const defaultDateFormat = 'MM/DD/YYYY';

const AGGREGATE_BY_DEFAULT_COLUMN_NAME = 'Number of Items';

const AGGREGATE_BY_DISABLED_COLUMN_NAME = 'None';

const GROUP_BY_DATE_DISABLED = 'None';

const isDate = (dataSourceDescription, columnName) => {
    if (dataSourceDescription.raw_rowObjects_coercionScheme) {
        const coercion = dataSourceDescription.raw_rowObjects_coercionScheme;
        if (coercion[columnName] && coercion[columnName].operation === 'ToDate') {
            return true;
        } else {
            // if there are any custom fields to process, recurse through them
            for (let i = 0; i < dataSourceDescription.customFieldsToProcess.length; i++) {
                const mergedFields = dataSourceDescription.customFieldsToProcess[i].fieldsToMergeIntoArray;
                const fieldName = dataSourceDescription.customFieldsToProcess[i].fieldName;
                if (fieldName === columnName) {
                    return isDate(dataSourceDescription, mergedFields[i]);
                }
            }
        }
    }
    return false;
};

const isNumber = (dataSourceDescription, columnName) => {
    if (dataSourceDescription.raw_rowObjects_coercionScheme) {
        const coercion = dataSourceDescription.raw_rowObjects_coercionScheme;
        if (coercion[columnName] && numberOperations.includes(coercion[columnName].operation)) {
            return true;
        }
    }
    return false;
};

const formatDefaultView = view => kebabCase(view);

const hasMoreThanOneView = views => {
    let numberOfViews = 0;
    for (let view in views) {
        if (views[view].visible === true) {
            numberOfViews++;
        }
        if (numberOfViews > 1) {
            return true;
        }
    }
    return false;
};

// todo: merge with calculatePageRanges?
const calculateGalleryPageRanges = numResults => {
    let pageRanges = [];

    if (numResults > 200) {
        pageRanges = [5, 10, 20, 50, 100, 200];
    } else if (numResults > 100) {
        pageRanges = [5, 10, 20, 50, 100];
    } else if (numResults > 50) {
        pageRanges = [5, 10, 20, 50];
    } else if (numResults > 20) {
        pageRanges = [5, 10, 20];
    } else if (numResults > 10) {
        pageRanges = [5, 10];
    } else if (numResults > 5) {
        pageRanges = [5];
    }

    if (!pageRanges.includes(numResults) && numResults < 200) {
        pageRanges.push(numResults);
    }

    return pageRanges;
};

const userRoles = {
    visualizationEditor: 'visualizationEditor',
    admin: 'admin',
    editor: 'editor',
    viewer: 'viewer',
};

const PERCENT_UNIT = '%';

module.exports = {
    defaultPageSize,
    groupSizes,
    defaultDateFormat,
    AGGREGATE_BY_DEFAULT_COLUMN_NAME,
    AGGREGATE_BY_DISABLED_COLUMN_NAME,
    GROUP_BY_DATE_DISABLED,
    PERCENT_UNIT,
    isDate,
    isNumber,
    formatDefaultView,
    hasMoreThanOneView,
    calculateGalleryPageRanges,
    userRoles,
};
