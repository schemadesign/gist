((arrays, $, d3, _) => {
    Object.assign(arrays, {
        initBarChart,
    });

    /**
     * Gist Core view: Bar Chart
     */
    function initBarChart(options) {
        $(document).ready(function() {
            const view = $(options.viewSelector);
            const apiRoute = arrays.getApiRoute(options, '/views/bar-chart/graph-data');

            $.get(apiRoute, function(data) {
                let barChart;

                // no data
                if (!data || !data.docs || data.docs.length === 0) {
                    // hide loading template
                    view.find('.gist-loading').hide();

                    if (data.undisplayableData) {
                        // show undisplayable-data template
                        view.find('.gist-undisplayable-data').show();
                    } else {
                        // hide UI elements
                        view.find('.gist-controls').hide();

                        // show no-data template
                        view.find('.gist-no-data').show();
                    }

                    // screenshot callback
                    arrays.takeScreenshot();

                    // skip rendering the visualization
                    return;
                }

                const sortType = options.horizontal ? 'gist-sort-vertically' : 'gist-sort-horizontally';
                view.find('.gist-sort-direction-control').addClass(sortType);

                // Augment options
                Object.assign(options, {
                    annotations: data.annotations,
                });

                // hide loading template
                view.find('.gist-loading').hide();

                // hide UI elements
                if (options.puppeteer) {
                    view.find('.gist-legend').hide();
                    view.find('.gist-controls').hide();
                    view.removeClass('gist-legend-opened');
                }

                // single result
                if (typeof data.numberOfResults !== 'undefined' && data.numberOfResults === 1) {
                    arrays.showSingleResultModal();
                }

                if (arrays.PaginationNav && !options.puppeteer) {
                    // create pagination UI
                    if (options.viewOptions.viewControls) {
                        new arrays.PaginationLimitDropdown()
                            .init(data, options)
                            .render('.gist-pagination-limit-dropdown');

                        new arrays.PaginationPageDropdown()
                            .init(data, options)
                            .render('.gist-pagination-page-dropdown');
                    }

                    new arrays.PaginationNav().init(data, options).render('.gist-bar-chart-pagination');
                }

                // render visualization
                setTimeout(renderBarChart, 400);
                updateBarChartControls();

                // screenshot callback
                arrays.takeScreenshot(1000);

                function renderBarChart() {
                    const {
                        MIN_CHART_HEIGHT_EXTENDED,
                        EMBEDDED_HEIGHT_RATIO,
                        EMBEDDED_NAVIGATION_BAR_HEIGHT,
                    } = arrays.constants;

                    // @todo: work on cleaning this up... some options coming from bar-chart.html, some from here
                    const internalOptions = getOptions();

                    // set margins
                    const maxValue = () => {
                        const graphData = data.graphData.data;

                        if (options.normalize) {
                            return 1;
                        }

                        return d3.max(
                            graphData.reduce((values, series) => {
                                return values.concat(d3.sum(series.map(d => (d.value > 0 ? d.value : 0))));
                            }, [])
                        );
                    };

                    const digitCount = maxValue().toString().length;
                    const mobileBottomMargin = 20;
                    const tabletBottomMargin = 40;
                    const bottomMargin =
                        window.innerWidth < arrays.constants.CUSTOM_SM_BREAKPOINT
                            ? mobileBottomMargin
                            : tabletBottomMargin;
                    options.margin = {
                        top: 25,
                        right: 15,

                        // Add more margin if filters present
                        bottom: bottomMargin,

                        // 2em axis label = 18px * 2 = 36
                        left: options.horizontal ? 120 : Math.max(10 * digitCount, 50) + 36,
                    };

                    const { isGroupByPercent, isAggregateByPercent, isStackByPercent } = data.meta;
                    // merge in (override) internal options with incoming options, piecewise
                    const mergedOptions = Object.assign({}, internalOptions, options, {
                        isGroupByPercent,
                        isAggregateByPercent,
                        isStackByPercent,
                    });

                    // main chart
                    // @todo: we are still recreating the chart completely here, but can move towards using the update
                    // and resize methods
                    const chartContainer = view.find('.gist-bar-chart-main').empty();

                    // vertically responsive, with minimum height
                    const paginationHeight = 135;

                    let height;

                    if (options.isExternalAccess) {
                        const offset = data.meta.numPages > 1 ? -paginationHeight : 0;

                        height = parseInt(view.parent().css('height'), 10) + offset;
                    } else if (options.isEmbed) {
                        const { top = 0, bottom = 0 } = options.margin;
                        const OFFSET = 30;

                        height =
                            EMBEDDED_HEIGHT_RATIO * arrays.getParentHeight() -
                            EMBEDDED_NAVIGATION_BAR_HEIGHT -
                            top -
                            bottom -
                            OFFSET;
                    } else {
                        height =
                            window.innerHeight -
                            _.defaultTo(chartContainer.offset(), { top: 0 }).top -
                            paginationHeight;
                    }

                    height = Math.max(height, MIN_CHART_HEIGHT_EXTENDED);

                    chartContainer.css('height', height);
                    barChart = options.horizontal ? new arrays.HorizontalBarChart() : new arrays.VerticalBarChart();

                    barChart.init(data.graphData, mergedOptions).render(`${options.viewSelector} .gist-bar-chart-main`);
                }

                function getOptions() {
                    const options = {
                        units: data.units,
                    };
                    const currentSearchQuery = window.location.search;

                    return _.transform(options, (result, value, key) => {
                        result[key] = currentSearchQuery.includes(key) ? true : value;
                    });
                }

                // String|Array.prototype.includes() not supported in IE
                function includes(item, search) {
                    return item.indexOf(search) !== -1;
                }

                // Handle of the "view by" - normalization, etc.
                function updateBarChartControls() {
                    if (options.hideNormalize) {
                        view.find('.gist-normalization').hide();
                    } else {
                        if (options.normalize) {
                            view.find('.gist-normalization .gist-relative').show();
                            view.find('.gist-normalization .gist-absolute').hide();
                        } else {
                            view.find('.gist-normalization .gist-relative').hide();
                            view.find('.gist-normalization .gist-absolute').show();
                        }
                    }

                    const sortDirection = options.sortDirection ? 'ascending' : 'descending';
                    view.find('.gist-sort-direction-control').attr('aria-sort', sortDirection);

                    if (options.accessibility) {
                        view.find('.gist-accessibility-on').show();
                        view.find('.gist-accessibility-off').hide();
                    } else {
                        view.find('.gist-accessibility-on').hide();
                        view.find('.gist-accessibility-off').show();
                    }
                }

                function handleClickEvent(option) {
                    arrays.updateQuery(options, option, !options[option]);
                    updateBarChartControls();

                    if (option === 'sortDirection') {
                        barChart.updateSortDirection(options.sortDirection);
                        updatePatternUrls();
                    } else {
                        renderBarChart();
                    }
                }

                view.find('.gist-normalization').click(function() {
                    handleClickEvent('normalize');
                });

                view.find('.gist-sort-direction-control').click(function() {
                    handleClickEvent('sortDirection');
                });

                view.find('.gist-toggle-accessibility').click(function() {
                    handleClickEvent('accessibility');
                });

                function reconstructSearch(parts, colName) {
                    let search = '?';
                    for (let i = 0; i < parts.length; i++) {
                        if (!includes(parts[i], colName)) {
                            search += parts[i] + '&';
                        }
                    }
                    // if there's a trailing '&', remove it
                    if (search[search.length - 1] === '&') {
                        return search.slice(0, search.length - 1);
                    }
                    return search;
                }

                function splitParts(url, colName) {
                    const urlParts = url.split('?');
                    const pathname = urlParts[0];
                    const search = urlParts[1];
                    const partsOfSearch = search.split('&');
                    return pathname + reconstructSearch(partsOfSearch, colName);
                }

                function constructQueryWithoutFilterName(url, filterName) {
                    if (includes(url, filterName)) {
                        return splitParts(url, filterName);
                    }
                    return url;
                }

                // TODO: why do we need this event?
                view.find('.chart-by-options li a').on('click', function(e) {
                    e.preventDefault();
                    const $this = $(this);
                    const filterName = $this.data().attribute;
                    const colName = encodeURIComponent($this.text());

                    const link = $this.attr('href');
                    const url = window.location.pathname + window.location.search;
                    const linkWithoutFilterName = constructQueryWithoutFilterName(link, filterName);
                    const urlWithoutFilterName = constructQueryWithoutFilterName(url, filterName);

                    if (linkWithoutFilterName !== urlWithoutFilterName) {
                        if (includes(urlWithoutFilterName, '?')) {
                            window.location.href = urlWithoutFilterName + '&' + filterName + '=' + colName;
                        } else {
                            window.location.href = urlWithoutFilterName + '?' + filterName + '=' + colName;
                        }
                    } else {
                        window.location.href = link;
                    }
                });

                window.onresize = function() {
                    renderBarChart();
                };

                /**
                 * Toggle legend
                 */
                view.find('.gist-legend-open').on('click', function(e) {
                    view.addClass('gist-legend-opened');
                    setTimeout(renderBarChart, 400);
                });

                /**
                 * Close legend
                 */
                view.find('.gist-legend-close').on('click', function(e) {
                    view.removeClass('gist-legend-opened');
                    setTimeout(renderBarChart, 400);
                });

                /**
                 * If the legend is closed when pressing the link to the legend
                 * Open it up!
                 */
                view.find('.gist-skip-to-legend').keydown(function(e) {
                    if (e.which === 13) {
                        view.addClass('gist-legend-opened');
                    }
                });

                /*
                 * Update accessibility patterns urls
                 * Because changing sort direction does not re-render the chart,
                 * And since we are using absolute url paths to specify the patterns to accomodate for Safari
                 * Toggling sort appends the sort query param and causes fill urls to fall out of sync with updated page url
                 * Rather than re-render the bar chart on sort (since we want to keep the animation),
                 * Programatically update each rect's fill url to sync with the updated page url
                 */
                function updatePatternUrls() {
                    const rects = view.find('.gist-chart-container svg rect');
                    if (rects[0].style.fill.indexOf('url(') !== -1) {
                        const relativePath = window.location.pathname + window.location.search;
                        for (let i = 0; i < rects.length; i += 1) {
                            const updatedFill =
                                'url("' + relativePath + rects[i].style.fill.slice(rects[i].style.fill.indexOf('#'));
                            rects[i].style.fill = updatedFill;
                        }
                    }
                }
            });

            initScrollMagic(true);
        });
    }
})(window.arrays, window.jQuery, window.d3, window._);
