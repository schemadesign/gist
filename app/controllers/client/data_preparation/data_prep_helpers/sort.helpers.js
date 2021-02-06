const { cond, constant, eq, stubTrue } = require('lodash');

const { SORT_ORDER_ASC, SORT_ORDER_DESC } = require('../../../../config/sort.config');
const {
    VIEW_TYPE_GALLERY,
    VIEW_TYPE_TIMELINE,
    VIEW_TYPE_BUBBLE_CHART,
    VIEW_TYPE_SCATTERPLOT,
    VIEW_TYPE_TABLE,
    VIEW_TYPE_PIE_SET,
} = require('../../../../config/views.config');
const { RealColumnNameFromHumanReadableColumnName } = require('../../../../libs/datasources/imported_data_preparation');

module.exports = {
    compareCreatedAt,
    getSort,
    getGallerySort,
    getTimelineSort,
    getPieSetSort,
};

const compare = cond([
    [(a, b) => a === b, constant(0)],
    [(a, b) => a > b, constant(1)],
    [stubTrue, constant(-1)],
]);
const equals = a => b => eq(a, b);

function compareCreatedAt(a, b) {
    return compare(a.createdAt, b.createdAt);
}

function getSort(viewType, dataSource, options) {
    const sortBy = cond([
        [equals(VIEW_TYPE_GALLERY), () => getGallerySort(dataSource, options)],
        [equals(VIEW_TYPE_TIMELINE), () => getTimelineSort(dataSource, options)],
        [equals(VIEW_TYPE_BUBBLE_CHART), () => getBubbleChartSort(options)],
        [equals(VIEW_TYPE_SCATTERPLOT), () => getScatterplotSort(options)],
        [equals(VIEW_TYPE_TABLE), () => getTableSort(dataSource, options)],
        [stubTrue, constant({ _id: 1 })],
    ]);

    return sortBy(viewType);
}

function getSortDirection(dataSource, options, viewType) {
    const { sortDirection, sortBy, sortByDate } = options;
    const { defaultSortByColumnName, defaultSortOrderDescending } = dataSource.fe_views.views[viewType];
    const sortByField = sortBy || defaultSortByColumnName;
    const sortByRealColumnName = RealColumnNameFromHumanReadableColumnName(sortByField, dataSource);
    const sortByRealColumnNamePath = `rowParams.${sortByRealColumnName}`;
    const defaultSortOrder = defaultSortOrderDescending ? SORT_ORDER_DESC : SORT_ORDER_ASC;
    const sortDirectionCopy = sortDirection || defaultSortOrder;
    const sort = sortDirectionCopy === SORT_ORDER_ASC ? 1 : -1;

    return { sort, sortByRealColumnNamePath, sortByDate };
}

function getGallerySort(dataSource, options) {
    const { sort, sortByRealColumnNamePath } = getSortDirection(dataSource, options, VIEW_TYPE_GALLERY);

    return {
        size: -sort,
        [sortByRealColumnNamePath]: sort,
        _id: sort,
    };
}

function getTimelineSort(dataSource, options) {
    const { sort, sortByRealColumnNamePath, sortByDate } = getSortDirection(dataSource, options, VIEW_TYPE_TIMELINE);

    return {
        [sortByRealColumnNamePath]: sortByDate ? -sort : sort,
        _id: sort,
    };
}

function getBubbleChartSort({ groupBy_realColumnName, defaultXAxisField, defaultYAxisField }) {
    const sortByGroupBy = `rowParams.${groupBy_realColumnName}`;
    const sortByXAxis = `rowParams.${defaultXAxisField}`;
    const sortByYAxis = `rowParams.${defaultYAxisField}`;

    return {
        [sortByGroupBy]: 1,
        [sortByXAxis]: 1,
        [sortByYAxis]: 1,
    };
}

function getScatterplotSort({ defaultXAxisField, defaultYAxisField }) {
    const sortByXAxis = `rowParams.${defaultXAxisField}`;
    const sortByYAxis = `rowParams.${defaultYAxisField}`;

    return {
        [sortByXAxis]: 1,
        [sortByYAxis]: 1,
        _id: 1,
    };
}

function getTableSort(dataSource, options) {
    const { sort, sortByRealColumnNamePath } = getSortDirection(dataSource, options, VIEW_TYPE_TABLE);

    return {
        [sortByRealColumnNamePath]: sort,
    };
}

function getPieSetSort(dataSource, options) {
    const { sort } = getSortDirection(dataSource, options, VIEW_TYPE_PIE_SET);

    return sort;
}
