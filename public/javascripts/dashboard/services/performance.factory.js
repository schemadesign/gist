/* global moment */
(function () {
    angular
        .module('arraysApp')
        /**
         * Performance API calls to Mixpanel (referred to as a service although it is technically a factory)
         */
        .factory('PerformanceService', ['$http',
            function($http) {

                function makeQueryString(params) {
                    var queries = [];
                    var string = '';

                    var keys = Object.keys(params);
                    var key;

                    for (var i = 0; i < keys.length; i++) {
                        key = keys[i];
                        queries.push(key + '=' + params[key]);
                    }

                    if (queries.length) {
                        string = '?' + queries.join('&');
                    }

                    return string;
                }

                function returnData(data) {
                    return data;
                }

                var getTotalPageViews = function (id, unit, type) {
                    var queryString = makeQueryString({
                        unit: unit,
                        type: type
                    });

                    return $http.get('api/performance/pageviews/total/' + id + queryString)
                        .then(returnData)
                        .catch(returnData);
                };

                var getPageViews = function (id, unit, type, limit) {
                    var queryString = makeQueryString({
                        unit: unit,
                        type: type,
                        limit: limit
                    });

                    return $http.get('api/performance/pageviews/' + id + queryString)
                        .then(returnData)
                        .catch(returnData);
                };

                var getReferrers = function (id, unit, type) {
                    var queryString = makeQueryString({
                        unit: unit,
                        type: type
                    });

                    return $http.get('api/performance/referrers/' + id + queryString)
                        .then(returnData)
                        .catch(returnData);
                };

                var getTechnology = function (id, unit, type, technology) {
                    var queryString = makeQueryString({
                        unit: unit,
                        type: type
                    });

                    return $http.get('api/performance/technology/' + technology + '/' + id + queryString)
                        .then(returnData)
                        .catch(returnData);
                };

                var getSegment = function (id, params, operator) {
                    operator = operator ? operator + '/' : '';

                    var queryString = makeQueryString(params);
                    return $http.get('api/performance/segment/' + operator + id + queryString)
                        .then(returnData)
                        .catch(returnData);
                };

                return {
                    getTotalPageViews: getTotalPageViews,
                    getPageViews: getPageViews,
                    getReferrers: getReferrers,
                    getTechnology: getTechnology,
                    getSegment: getSegment
                };
            }
        ])
        /**
         * Manage data for caching across tabs
         */
        .factory('PerformanceData', [
            function() {
                var _data = {};

                var add = function(data, id, unit) {
                    // Add the id if needed
                    if (!_data[id]) {
                        _data[id] = {};
                    }

                    // Add the unit if needed
                    if (!_data[id][unit]) {
                        _data[id][unit] = {};
                    }

                    // Add the data
                    _data[id][unit] = data;
                };

                var get = function(id, unit) {
                    var data;

                    // Return the data, if stored
                    if (_data[id] && _data[id][unit]) {
                        data = _data[id][unit];
                    }

                    return data;
                };

                return {
                    add: add,
                    get: get
                };
            }
        ])
        /**
         * Helpers to convert Mixpanel response data for display
         */
        .factory('PerformanceDataFunc', [
            function() {
                var days = {
                    day: 1,
                    week: 7,
                    month: 30,
                    year: 365
                };

                var unitToDays = function(unit) {
                    return days[unit];
                };

                var sumValuesFromSeries = function (series, values) {

                    var keys = Object.keys(values);
                    var summed = {};

                    function makeSum(key) {
                        return function sum(acc, val) {
                            return acc + values[key][val];
                        };
                    }

                    for (var i = 0; i < keys.length; i++) {
                        var key = keys[i];
                        var sum = makeSum(key);

                        summed[key] = series.reduce(sum, 0);
                    }

                    return summed;
                };

                // Ensure the day index is within the series so Array#splice doesn't loop back around with negative values
                function seriesIndex (index, length) {
                    if (index < -length) {
                        index = 0;
                    }

                    return index;
                }

                function sliceCurrent(series, days) {
                    var from = seriesIndex(-days, series.length);
                    return series.slice(from);
                }

                function slicePrevious(series, days) {
                    var to = seriesIndex(-days, series.length);
                    var from = seriesIndex(-days * 2, series.length);
                    return series.slice(from, to);
                }

                function splitCurrentPrevious(series, days) {
                    return {
                        current: sliceCurrent(series, days),
                        previous: slicePrevious(series, days)
                    };
                }

                return {
                    unitToDays: unitToDays,
                    sumValuesFromSeries: sumValuesFromSeries,
                    splitCurrentPrevious: splitCurrentPrevious
                };
            }
        ])
        /**
         * Convert Mixpanel response data to Arrays graphData
         */
        .factory('PerformanceGraphData', ['PerformanceDataFunc',
            function(PerformanceDataFunc) {

                /**
                 * Coercion by chart type
                 */
                var barChart = function(panelData) {
                    var data = [];
                    var categories = [];

                    Object.keys(panelData.values).forEach(function(categoryKey) {
                        categories.push(categoryKey);

                        var thisData = [];

                        var thisValue = Object.keys(panelData.values[categoryKey]).reduce(function(sum, valueKey) {
                            return sum + panelData.values[categoryKey][valueKey];
                        }, 0);

                        thisData.push({
                            value: thisValue,
                            // label: TODO/NOTE Omit label. Nothing in the panelData contains the event, i.e. 'page viewed'.
                            category: categoryKey
                        });

                        data.push(thisData);
                    });

                    return {
                        data: data,
                        categories: categories
                    };
                };

                var lineChart = function(panelData) {
                    var data = [];
                    var labels = [];

                    Object.keys(panelData.values).forEach(function(labelKey) {
                        labels.push(labelKey);

                        var thisData = [];

                        Object.keys(panelData.values[labelKey]).forEach(function(dateKey) {
                            thisData.push({ y: panelData.values[labelKey][dateKey], x: moment(dateKey).toISOString() });
                        });

                        // Sort data by date
                        thisData.sort(function(a, b) {
                            return new Date(b.date) - new Date(a.date);
                        });

                        data.push(thisData);
                    });

                    return {
                        data: data,
                        labels: labels
                    };
                };

                var pieChart = function(panelData) {
                    var summedValues = PerformanceDataFunc.sumValuesFromSeries(panelData.series, panelData.values);

                    var data = [];

                    _.each(summedValues, function(summed, key) {
                        data.push({
                            value: summed,
                            label: key,
                        });
                    });

                    return {
                        data: data
                    };
                };

                return {
                    barChart: barChart,
                    lineChart: lineChart,
                    pieChart: pieChart
                };
            }
        ]);
})();
