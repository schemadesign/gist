const { cond, constant, eq, stubTrue } = require('lodash');

const { DATE_DURATION_DECADE } = require('../../../../config/dataTypes/date.config');
const { VIEW_TYPE_GALLERY, VIEW_TYPE_TIMELINE } = require('../../../../config/views.config');
const { RealColumnNameFromHumanReadableColumnName } = require('../../../../libs/datasources/imported_data_preparation');

module.exports = {
    getProject,
    getGalleryProject,
    getTimelineProject,
};

const equals = a => b => eq(a, b);

function getProject(viewType, dataSource, options) {
    const addProject = cond([
        [equals(VIEW_TYPE_GALLERY), () => getGalleryProject(dataSource, options)],
        [equals(VIEW_TYPE_TIMELINE), () => getTimelineProject(dataSource, options)],
        [stubTrue, constant({ rowParams: 1 })],
    ]);

    return addProject(viewType);
}

function getGalleryProject(dataSource, options) {
    const { sortBy } = options;
    const { defaultSortByColumnName } = dataSource.fe_views.views.gallery;

    const sortByField = sortBy || defaultSortByColumnName;
    const sortByRealColumnName = RealColumnNameFromHumanReadableColumnName(sortByField, dataSource);
    const sortByRealColumnNamePath = `rowParams.${sortByRealColumnName}`;

    return {
        rowParams: 1,
        size: {
            $cond: {
                if: { $isArray: `$${sortByRealColumnNamePath}` },
                then: { $size: `$${sortByRealColumnNamePath}` },
                else: 0,
            },
        },
    };
}

function getTimelineProject(dataSource, options) {
    const { groupBy_realColumnName, groupBy_isDate, groupByDuration } = options;

    const groupByRealColumnName = RealColumnNameFromHumanReadableColumnName(groupBy_realColumnName, dataSource);
    const groupByRealColumnNamePath = `rowParams.${groupByRealColumnName}`;
    const project = { rowParams: 1 };

    if (groupBy_isDate && groupByDuration === DATE_DURATION_DECADE) {
        project.year = { $year: `$${groupByRealColumnNamePath}` };
    }

    return project;
}
