const Qs = require('qs');
const _ = require('lodash');
const validator = require('validator');

module.exports = {
    constructedRoutePath,
    getRouteParams,
    extractHostname,
    getPreparedFilters,
};

function getRouteParams(routePath_base = '') {
    if (routePath_base.includes('?')) {
        const [routePath, routePath_queryParams] = routePath_base.split('?');
        return {
            routePath,
            routeParams: Qs.parse(routePath_queryParams),
        };
    }

    return {
        routePath: routePath_base,
        routeParams: {},
    };
}

function getPreparedFilters({ routeParams, filterObj, options }) {
    const queries = [
        'accessibility', 'aggregateBy', 'colFilter', 'chartBy', 'embed', 'groupBy', 'groupByDuration', 'groupByRange',
        'groupSize', 'horizontal', 'limit', 'mapBy', 'nested', 'normalize', 'page', 'preview', 'radius', 'revision',
        'searchCol', 'searchQ', 'secondaryCol', 'sortBy', 'sortDirection', 'stackBy', 'timeValue', 'xAxis', 'yAxis',
        'instanceId', 'objectIndex', 'viewType', 'queryFilters', 'segmentBy',
    ];
    const queryOptions = _.pick(options, queries);
    const queryObj = _.merge(routeParams, filterObj, queryOptions);
    const filteredQueryObj = _.omitBy(queryObj, (data) => data === '' || _.isNil(data));
    const preparedFilters = _.reduce(filteredQueryObj, (acc, param, key) => {
        const unescapeValue = (value) => _.isString(value) ? validator.unescape(value) : value;
        acc[key] = _.isArray(param) ? filteredQueryObj[key].map(unescapeValue) : param;

        return acc;
    }, {});

    return preparedFilters;
}

function constructedRoutePath(routePath_base, filterObj = {}, options = {}, isSharedPage) {
    const { routePath, routeParams } = getRouteParams(routePath_base);
    const preparedFilters = getPreparedFilters({ routeParams, filterObj, options });

    if (isSharedPage) {
        preparedFilters.queryFilters = true;
    }

    const mainPath = routePath.replace(/\/timeline$/, '/grouped-gallery');

    if (_.isEmpty(preparedFilters)) {
        return mainPath;
    }

    return `${mainPath}?${Qs.stringify(preparedFilters)}`;
}

function extractHostname(url) {
    let hostname = _.trim(url);

    if (hostname.includes('//')) {
        hostname = hostname.split('//')[1];
    }

    hostname = hostname.split('/')[0];
    hostname = hostname.split(':')[0];
    hostname = hostname.split('?')[0];

    return hostname.startsWith('www.') ? hostname.replace('www.', '') : hostname;
}
