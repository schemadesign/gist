((arrays, $, d3, moment) => {
    Object.assign(arrays, {
        initMap,
    });

    /**
     * Gist Core view: Map
     */
    function initMap(options) {
        /**
         * Arrays Core view: Map
         *
         * Customizations from base Map class:
         *     -
         */
        $(document).ready(function() {
            const { MAP_STYLES, CUSTOM_COLUMN_DISABLED, EMBEDDED_NAVIGATION_BAR_HEIGHT } = arrays.constants;
            const apiRoute = arrays.getApiRoute(options, '/views/map/graph-data');
            const view = $(options.viewSelector);
            const gistControls = view.find('.gist-controls');

            // ajax call with object
            $.get(apiRoute, function(data) {
                // no data
                if (data.docs.length === 0) {
                    // hide loading template
                    view.find('.gist-loading').hide();

                    if (data.undisplayableData) {
                        view.addClass('gist-map--no-data gist-map--undisplayable-data');
                        view.find('.gist-undisplayable-data').show();

                        // show UI elements
                        gistControls.show();
                    } else {
                        // show no-data template
                        view.addClass('gist-map--no-data');
                        view.find('.gist-no-data').show();
                    }

                    // screenshot callback
                    if (typeof window.callPhantom === 'function') {
                        window.callPhantom('takeShot');
                    }

                    // skip rendering the visualization
                    return;
                }

                // hide loading template
                view.find('.gist-loading').hide();

                // show UI elements

                if (options.puppeteer) {
                    gistControls.hide();
                } else {
                    gistControls.show();
                }

                const aggregateBySelect = view.find('.aggregate-by');
                const aggregateByList = aggregateBySelect.find('.chart-by-options').children();
                if (options.aggregateBy !== CUSTOM_COLUMN_DISABLED || aggregateByList.length > 0) {
                    aggregateBySelect.show();
                }

                if (options.mapStyle === MAP_STYLES.COUNTRY) {
                    view.find('.map-by').show();
                }

                // single result
                if (data.meta.numberOfResults === 1) {
                    arrays.showSingleResultModal();
                }

                function getHeight(singleMapContainer) {
                    const parent = view.parents('.gist-component')[0];

                    if (options.isExternalAccess && parent.style.height) {
                        return parent.style.height;
                    } else if (options.isEmbed) {
                        return arrays.getIframeHeight() - EMBEDDED_NAVIGATION_BAR_HEIGHT;
                    }

                    const offsetY = singleMapContainer.offsetTop;

                    return window.innerHeight - offsetY;
                }

                function resizeContainer() {
                    /**
                     * Set container height for MapGL canvas
                     **/
                    const mapContainers = view.find('.gist-content');
                    const singleMapContainer = mapContainers[0];
                    const bottomMargin = window.innerWidth < arrays.constants.CUSTOM_SM_BREAKPOINT ? 150 : 100;
                    const height = getHeight(singleMapContainer) - bottomMargin;

                    singleMapContainer.style.height = `${height}px`;
                }

                resizeContainer();

                arrays.addResizeEventListener(resizeContainer);

                const mapLayout = [MAP_STYLES.COUNTRY, MAP_STYLES.HEATMAP].includes(options.mapStyle) ?
                    options.basicLayout :
                    options.roadsLayout;

                // Augment options
                $.extend(true, options, {
                    mapLayout,
                    coordMap: ![MAP_STYLES.COUNTRY, MAP_STYLES.HEATMAP].includes(options.mapStyle),
                    useLogScale: [MAP_STYLES.COUNTRY, MAP_STYLES.HEATMAP].includes(options.mapStyle),
                    noiseLevel: data.meta.noiseLevel,
                    maxValue: data.meta.maxValue,
                });

                // shared d3 dispatch for sending events between pie chart and legend
                var dispatch = d3.dispatch('legendListItem_mouseenter', 'legendList_mouseout', 'legendListItem_click');

                if (options.isExternalAccess) {
                    view.addClass('gist-map--full-height');
                }

                const { isAggregateByPercent, isMapByPercent } = data.meta;
                const arraysHelper = arrays.Visualization.prototype;

                // main chart
                var map = new arrays.CoreMap()
                    .setDispatch(dispatch)
                    .init(data.graphData, {
                        ...options,
                        isMapByPercent,
                        isAggregateByPercent,
                    })
                    .render(`${options.viewSelector} .gist-map`);

                data.formattedData = {};
                data.formattedData.data = data.graphData.data.features.map(function(d) {
                    let label = d.properties.name;

                    if (options.mapBy_isDate) {
                        label = arraysHelper.formatField(options.mapBy, label);
                    } else if (isMapByPercent) {
                        label = arraysHelper.getPercentFormatter(label);
                    }

                    return {
                        value: d.properties.total,
                        label: label,
                        coordinates: d.geometry.coordinates,
                    };
                });
                // Get the formatted color opacity values from map._data.features
                if (options.mapStyle === MAP_STYLES.COUNTRY) {
                    data.formattedData.opacities = map._data.features.map(function(feature) {
                        return feature.properties.normalizedMetric;
                    });
                }

                if (options.mapStyle === MAP_STYLES.HEATMAP) {
                    data.formattedData.colors = map._data.features.map(({ properties }) => properties.color);
                } else {
                    data.formattedData.colors = [options.brandColor.accent];
                }

                if (options.displayLegend && !options.puppeteer) {
                    const legend = new arrays.LegendList().setDispatch(dispatch);

                    const renderLegend = () =>
                        legend
                            .init(data.formattedData, {
                                ...options,
                                isMapByPercent,
                                isAggregateByPercent,
                            })
                            .render(`${options.viewSelector} .gist-legend-list`);
                    const { LEGEND_STYLE_ICON } = arrays.LegendList.prototype;

                    if (options.mapStyle === MAP_STYLES.PIN) {
                        const pinPathPrefix = options.isExternalAccess ? '' : '/images';
                        const pinPath = `${options.cdnAddress}${pinPathPrefix}/map/map-pin.png`;

                        map._map.loadImage(pinPath, function(error, image) {
                            arrays.changeImageColor(image, map.getFillColorExpression(), legendIcon => {
                                legend.setLegendStyle(LEGEND_STYLE_ICON, { legendIcon });
                                renderLegend();
                            });
                        });
                    } else {
                        renderLegend();
                    }
                }

                // when legend list item is clicked, apply filter
                dispatch.on('legendListItem_click', function(element, d, i) {
                    map.clickLegendItem(element, d, i);
                });

                /**
                 * Toggle legend
                 */
                view.find('.gist-legend-open').on('click', function(e) {
                    view.addClass('gist-legend-opened');

                    setTimeout(function() {
                        map._map.resize();
                    }, 400);
                });

                /**
                 * Close legend
                 */
                view.find('.gist-legend-close').on('click', function(e) {
                    view.removeClass('gist-legend-opened');

                    setTimeout(function() {
                        map._map.resize();
                    }, 400);
                });

                arrays.addResizeEventListener(function() {
                    map._map.resize();
                }, true);

                initScrollMagic();
            });
        });
    }
})(window.arrays, window.jQuery, window.d3, window.moment);
