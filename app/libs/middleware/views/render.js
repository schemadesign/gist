const winston = require('winston');
const { cloneDeep, omit, get, cond, constant, stubTrue } = require('lodash');

const {
    useLightBrandText,
    calcContentColor,
    fieldOverrideIfExists,
} = require('../../../controllers/client/func');
const config = require('../../../controllers/client/config');
const { canCreateInsight } = require('../../../controllers/api/permissions');
const { CONTENT_ONLY_TYPE } = require('../../utils/view-types');
const { equals, isEmbed } = require('../../../utils/helpers');
const {
    getLibrariesPaths,
    AREA_CHART_LIBRARIES,
    BAR_CHART_LIBRARIES,
    LINE_GRAPH_LIBRARIES,
    PIE_CHART_LIBRARIES,
    MAP_LIBRARIES,
    TREEMAP_LIBRARIES,
} = require('./libraryList');

const isInsightsExplorer = (fe_viewOptions, query) => isEmbed(query) ? fe_viewOptions.insightsExplorerEmbed : fe_viewOptions.insightsExplorer;

module.exports.render = function (req, res, next) {
    // bail out if this is a shared page but the pageType doesn't match
    if (req.sharedPage.isSharedPage && req.sharedPage.doc.pageType !== 'array_view') {
        next();
        return;
    }

    // todo: consider refactoring templates to use e.g. `dataSource.title` instead of `arrayTitle`, so not all
    //  controllers have to prep these variables then we could do something cleaner and easier like
    //  const bindData = {
    //    user: req.user,
    //    team: req.team,
    //    dataSource: req.dataSource,
    //    ...
    //  };

    const isExternalAccess = () => req.query.viewType === CONTENT_ONLY_TYPE;

    const getViewLibrary = cond([
        [equals('line-graph'), constant(LINE_GRAPH_LIBRARIES)],
        [equals('bar-chart'), constant(BAR_CHART_LIBRARIES)],
        [equals('area-chart'), constant(AREA_CHART_LIBRARIES)],
        [equals('pie-chart'), constant(PIE_CHART_LIBRARIES)],
        [equals('line-graph'), constant(LINE_GRAPH_LIBRARIES)],
        [equals('map'), constant(MAP_LIBRARIES)],
        [equals('treemap'), constant(TREEMAP_LIBRARIES)],
        [stubTrue, constant([])],
    ]);

    const query = req.query;

    const dataSourceDescription = req.dataSource;

    const preview = req.preview;

    const sharedPage = req.sharedPage;

    const camelCaseViewType = req.camelCaseViewType;
    const viewType = req.viewType;

    const groupBy = req.groupBy;
    const chartBy = req.chartBy;
    const segmentBy = req.segmentBy;
    const aggregateBy = req.aggregateBy;
    const axes = req.axes;
    const sortBy = req.sortBy;
    const stackBy = req.stackBy;
    const mapBy = req.mapBy;
    const secondaryCol = req.secondaryCol;
    const filter = req.filter;
    const colFilter = req.colFilter;
    const search = req.search;
    const pagination = req.pagination;
    const imageMeta = req.imageMeta;
    const timeValue = req.timeValue;

    const areas = req.areas;
    const lines = req.lines;
    const pies = req.pies;

    const clickThroughView = req.clickThroughView;
    const currentView = dataSourceDescription.fe_views.views[camelCaseViewType];

    const libraries = getLibrariesPaths(isExternalAccess());
    const viewLibrary = getViewLibrary(req.viewType);

    const viewLibraries = viewLibrary ? [
        ...libraries.VIEW_LIBRARIES,
        ...viewLibrary,
    ] : [];

    const viewInstanceId = req.viewInstanceId;
    const isCustomInstance = req.isCustomInstance;
    const viewOptions = dataSourceDescription.fe_viewOptions;
    const bindData = {
        // environment
        env: process.env,

        // user
        user: req.populatedUser,

        //library path
        arrayLibraries: [
            ...libraries.BASE_VENDORS,
            ...libraries.SIDEBAR_VENDOR,
            ...libraries.SIDEBAR_JAVASCRIPT,
        ],

        globalLibraries: [
            ...libraries.JAVASCRIPT,
        ],

        viewLibraries,

        paginationLibraries: libraries.PAGINATION_LIBRARIES,

        isExternalAccess: isExternalAccess(),

        // team
        team: dataSourceDescription._team ? dataSourceDescription._team : null,
        header_script: dataSourceDescription._team.header_script,
        footer_script: dataSourceDescription._team.footer_script,
        has_google_analytics: dataSourceDescription._team.google_analytics || process.env.GOOGLE_ANALYTICS_ID,
        team_analytics_id: dataSourceDescription._team.google_analytics || null,

        // type
        viewType: viewType,

        // datasource
        array_source_key: dataSourceDescription.uid,
        arrayTitle: dataSourceDescription.title,
        arrayTitleEscaped: encodeURIComponent(dataSourceDescription.title),
        storiesUri: '',
        banner: dataSourceDescription.banner,
        brandColor: {
            accent: dataSourceDescription.brandColor.accent,
            label: dataSourceDescription._team.brandColor.label,
            select: dataSourceDescription._team.brandColor.select,
        },
        brandWhiteText: useLightBrandText(dataSourceDescription.brandColor.accent),
        brandContentColor: calcContentColor(dataSourceDescription.brandColor.accent),
        datasetId: dataSourceDescription._id,
        description: dataSourceDescription.description || '',
        view_visibility: dataSourceDescription.fe_views.views || {},
        view_description: currentView.description || '',
        metaDescription: currentView.metaDescription || '',
        renameMultipleText: currentView.renameMultipleText || false,
        clickThroughView: clickThroughView,
        isPublic: dataSourceDescription.isPublic,
        displayTitleOverrides: cloneDeep(dataSourceDescription.fe_displayTitleOverrides),
        // multiselectable filter fields
        multiselectableFilterFields: dataSourceDescription.fe_filters.fieldsMultiSelectable,
        rangeSliderFilterFields: dataSourceDescription.fe_filters.fieldsAsRangeSlider,
        defaultView: config.formatDefaultView(dataSourceDescription.fe_views.default_view),
        viewOptions,
        showInsightsExplorer: isInsightsExplorer(viewOptions, query) && !preview.isPreview,
        lastUpdated: !preview.isPreview && viewOptions.enableLastUpdated && dataSourceDescription.updatedAt,
        showViewMenu: config.hasMoreThanOneView(dataSourceDescription.fe_views.views),
        hasGalleryView: get(dataSourceDescription.fe_views.views.gallery, 'visible', false),
        galleryStyle: currentView.galleryStyle,
        mapStyle: currentView.mapStyle,
        mapScaleType: currentView.mapScaleType || 'linear',
        displayAggregate: currentView.displayAggregate,
        colorScheme: currentView.colorScheme || 'default',
        useLogScale: currentView.useLogScale || false,
        groupedBars: currentView.groupedBars || false,
        showPercentage: currentView.showPercentage || false,
        hideNormalize: currentView.hideNormalize || false,
        format: dataSourceDescription.format,
        openDownload: dataSourceDescription.openDownload,
        areas,
        lines,
        pies,

        // object title
        fieldKey_objectTitle: dataSourceDescription.objectTitle,
        humanReadableColumnName_objectTitle: fieldOverrideIfExists(dataSourceDescription.objectTitle, dataSourceDescription),

        // revision
        revision: req.revision,

        // source doc
        sourceDoc: req.sourceDoc,
        sourceDocURL: req.sourceDocURL,

        // sample doc
        sampleDoc: req.sampleDoc,

        // nested
        constructedNestedObj: req.constructedNestedObj,
        nestedArray: req.nestedArray,
        nestedPath: req.nestedPath,

        // count stories & stories
        storiesCount: req.storiesCount,
        stories: req.stories,

        // groupBy
        groupBy: groupBy.groupBy,
        groupBy_isDate: groupBy.groupBy_isDate,
        groupBy_isNumber: groupBy.groupBy_isNumber,
        groupBy_outputInFormat: groupBy.groupBy_outputInFormat,
        groupBy_inputFormat: groupBy.groupBy_inputFormat,
        defaultGroupByColumnName_humanReadable: groupBy.defaultGroupByColumnName_humanReadable,
        colNames_orderedForGroupByDropdown: groupBy.colNames_orderedForGroupByDropdown,
        groupBy_realColumnName: groupBy.groupBy_realColumnName,
        groupByDuration: groupBy.groupByDuration,
        groupByRange: groupBy.groupByRange,
        durationsAvailableForGroupBy: groupBy.durationsAvailableForGroupBy,
        rangesAvailableForGroupBy: groupBy.rangesAvailableForGroupBy,

        // groupSize
        groupSize: req.groupSize,

        // segmentBy
        segmentBy,

        // chartBy
        chartBy: chartBy.chartBy,
        defaultChartByColumnName_humanReadable: chartBy.defaultChartByColumnName_humanReadable,
        colNames_orderedForChartByDropdown: chartBy.colNames_orderedForChartByDropdown,
        chartBy_realColumnName: chartBy.chartBy_realColumnName,

        // Aggregate By
        aggregateBy: aggregateBy.aggregateBy,
        aggregateBy_realColumnName: aggregateBy.aggregateBy_realColumnName,
        aggregateByColumnName_humanReadable: aggregateBy.aggregateBy_humanReadable,
        colNames_orderedForAggregateByDropdown: aggregateBy.colNames_orderedForAggregateByDropdown,
        defaultAggregateByColumnName: aggregateBy.defaultAggregateByColumnName,
        defaultAggregateByColumnName_humanReadable: aggregateBy.defaultAggregateByColumnName_humanReadable,

        // axes
        xAxis: axes.xAxis,
        yAxis: axes.yAxis,
        xAxis_realName: axes.xAxis_realName,
        yAxis_realName: axes.yAxis_realName,
        xAxis_humanReadable: axes.xAxis_humanReadable,
        yAxis_humanReadable: axes.yAxis_humanReadable,
        colNames_orderedForXAxisDropdown: axes.colNames_orderedForXAxisDropdown,
        colNames_orderedForYAxisDropdown: axes.colNames_orderedForYAxisDropdown,
        defaultXAxisField: axes.defaultXAxisField,
        defaultYAxisField: axes.defaultYAxisField,

        // radius
        radius: req.radius,

        // sortBy
        sortBy: sortBy.sortBy,
        colNames_orderedForSortByDropdown: sortBy.colNames_orderedForSortByDropdown,
        colNames_orderedForDisplayTitleDropdown: sortBy.colNames_orderedForDisplayTitleDropdown,
        sortDirection: sortBy.sortDirection,
        defaultSortByColumnName_humanReadable: sortBy.defaultSortByColumnName_humanReadable,
        defaultSortOrderDescending: sortBy.defaultSortOrderDescending,
        allowSortByYAxis: sortBy.allowSortByYAxis,
        defaultAxisSort: sortBy.defaultAxisSort,
        defaultAxisAvailableForSortBy: sortBy.defaultAxisAvailableForSortBy,
        sortBy_realColumnName: sortBy.sortBy_realColumnName,
        sortByDate: sortBy.isDate,
        sortByNumber: sortBy.isNumber,

        // stackBy
        stackBy: stackBy.stackBy,
        defaultStackByColumnName_humanReadable: stackBy.defaultStackByColumnName_humanReadable,
        stackBy_realColumnName: stackBy.stackBy_realColumnName,
        stackBy_isDate: stackBy.stackBy_isDate,
        colNames_orderedForStackByDropdown: stackBy.colNames_orderedForStackByDropdown,

        // mapBy
        mapBy: mapBy.mapBy,
        mapBy_realColumnName: mapBy.mapBy_realColumnName,
        mapBy_isDate: mapBy.mapBy_isDate,
        colNames_orderedForMapByDropdown: mapBy.colNames_orderedForMapByDropdown,

        // map defaults
        defaultLatitude: currentView.defaultLatitude || 35,
        defaultLongitude: currentView.defaultLongitude || 0,
        defaultZoom: currentView.defaultZoom || 1.5,

        // secondaryCol
        secondaryCol: secondaryCol.secondaryCol,
        secondaryColumnTileDisplay: secondaryCol.secondaryColumnTileDisplay,
        secondaryColumnTileShow: secondaryCol.secondaryColumnTileShow || false,

        // filtering
        filterObj: filter.filterObj,
        defaultFilterObj: filter.defaultFilterObj,
        isFilterActive: filter.isFilterActive,
        uniqueFieldValuesByFieldName: filter.uniqueFieldValuesByFieldName,
        truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill: filter.truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill,
        colFilter: colFilter.col,
        isColFilterActive: colFilter.isColFilterActive,

        // search
        cols_orderedForSearchByDropdown: search.cols_orderedForSearchByDropdown,
        searchQ: search.searchQ,
        searchCol: search.searchCol,
        isSearchActive: search.isSearchActive,

        // pagination
        limit: pagination.limit,
        page: pagination.page,
        pageNumber: pagination.pageNumber,
        skipNResults: pagination.skipNResults,
        onPageNum: pagination.onPageNum,
        resultsOffset: pagination.resultsOffset,

        // image meta
        scrapedImages: imageMeta.scrapedImages,
        scrapedImageField: imageMeta.scrapedImageField,

        routePath_base: req.routePath_base,

        // embed
        embedded: query.embed,
        isEmbed: isEmbed(query),

        // preview
        isPreview: preview.isPreview,

        // shared page
        sharedPage: sharedPage.isSharedPage,
        sharedPageId: sharedPage.sharedPageId,

        subdomain: req.subdomain,
        cdnAddress: req.cdnAddress,

        // @todo: bar chart specific?
        // some new query params in here... new middleware for:
        // accessibilityMode
        // other?
        sortbarOptions: {
            colFilter: colFilter.col,
            searchCol: search.searchCol,
            searchQ: search.searchQ,
            aggregateBy: aggregateBy.aggregateBy,
            groupBy: groupBy.groupBy,
            groupByDuration: groupBy.groupByDuration,
            groupByRange: groupBy.groupByRange,
            stackBy: stackBy.stackBy,
            sortBy: sortBy.sortBy,
            normalize: query.normalize, // new, bar chart specific
            sortDirection: sortBy.sortDirection,
            accessibility: query.accessibility,
        },
        dropdownSortBy: sortBy.sortBy,
        chronological: sortBy.sortBy === 'X Axis' || (!sortBy.sortBy && sortBy.defaultAxisSort === 'X Axis'),

        // filter pills for simple chart column filter
        filterBarOptions: omit(this.sortbarOptions, ['colFilter']),
        filterObjWithColFilter: colFilter.col ? Object.assign({ colFilter: colFilter.col }, filter.filterObj) : filter.filterObj,

        // bar chart bars
        simpleChart: req.simpleChart, //new, bar/line/area chart specific
        bars: req.bars.bars || null,

        // orientation
        // Currently used in bar chart for vertical/horizontal orientation but could be useful for future views
        // Legacy support: use query.horizontal as a fallback for bar chart if specified in query
        orientation: currentView.orientation || (query.horizontal ? 'horizontal' : ''),

        // legend display
        // Hide/Show option current used only for the map view
        displayLegend: currentView.displayLegend || false,

        // Display navigation toggle used for line chart and area chart
        displayNavigationChart: currentView.displayNavigationChart,

        timeValue: timeValue,
        canCreateInsight: canCreateInsight(req.populatedUser, dataSourceDescription),
        largeTilesWithCaptions: Boolean(currentView.largeTilesWithCaptions),

        viewInstanceId,
        isCustomInstance,
    };

    if (req.puppeteer || query.puppeteerDebug) {
        bindData.viewOptions = {};
        bindData.isFilterActive = false;
        bindData.displayLegend = false;
        bindData.puppeteer = true;
    }

    if (req.puppeteerScreenshot || query.puppeteerScreenshotDebug) {
        bindData.viewOptions = dataSourceDescription.fe_viewOptions;
        bindData.displayLegend = true;
        bindData.puppeteerScreenshot = true;
    }

    winston.debug('bindData ready, rendering page');
    if (isExternalAccess()) {
        return res.render(`array/content/${req.viewType}-content`, bindData);
    }

    return res.render(`array/${req.viewType}`, bindData);
};
