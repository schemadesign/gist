const { defaultTo } = require('lodash');

module.exports.addDataPrepOptions = function (req, res, next) {
    const query = req.query;
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
    const pagination = defaultTo(req.pagination, {});
    const preview = req.preview;
    const lines = req.lines;
    const bars = defaultTo(req.bars, {});
    const areas = req.areas;
    const pies = req.pies;
    const annotations = req.annotations;
    const units = req.units;
    const timeValue = req.timeValue;

    req.dataPrepOptions = {

        // view
        viewLookup: req.viewLookup,

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

        // chartBy
        chartBy: chartBy.chartBy,
        defaultChartByColumnName_humanReadable: chartBy.defaultChartByColumnName_humanReadable,
        colNames_orderedForChartByDropdown: chartBy.colNames_orderedForChartByDropdown,
        chartBy_realColumnName: chartBy.chartBy_realColumnName,

        // Segment By
        segmentBy: segmentBy,

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
        defaultAxisSort: sortBy.defaultAxisSort,
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

        // secondaryCol
        secondaryCol: secondaryCol.secondaryCol,
        secondaryColumnTileDisplay: secondaryCol.secondaryColumnTileDisplay,
        secondaryColumnTileShow: secondaryCol.secondaryColumnTileShow || false,

        // filtering
        filterObj: filter.filterObj,
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

        // embed
        embedded: query.embed,

        // preview
        isPreview: preview.isPreview,
        preview_url: preview.preview_url,

        // bars
        bars: bars.bars,
        type: bars.type,

        lines,
        areas,
        pies,

        // annotations
        annotations: annotations,

        // units
        units: units,

        // timeValue
        timeValue: timeValue,

        routePath_base: req.routePath_base,

        // click through view
        clickThroughView: req.clickThroughView,

        // nested
        constructedNestedObj: req.constructedNestedObj,
        nestedArray: req.nestedArray,
        nestedPath: req.nestedPath,
    };

    next();
};
