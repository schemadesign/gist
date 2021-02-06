((arrays, $, d3, _) => {
    Object.assign(arrays, {
        initTreeMap,
    });

    /**
     * External namespace for arrays classes
     * @external arrays
     */

    /**
     * Arrays Core view: Treemap
     */

    function initTreeMap(options) {
        const { viewSelector, isExternalAccess, viewOptions } = options;
        const view = $(options.viewSelector);
        const apiRoute = arrays.getApiRoute(options, '/views/treemap/graph-data');

        // ajax call with object
        $.get(apiRoute, function(data) {
            options.nonpagedCount = data.meta.nonpagedCount;

            // no data
            if (data.docs.length === 0) {
                // hide loading template
                view.find('.gist-loading').hide();

                if (data.undisplayableData) {
                    // show undisplayable-data template
                    view.find('.gist-undisplayable-data').show();

                    // show UI elements
                    view.find('.gist-controls').show();
                } else {
                    // show no-data template
                    view.find('.gist-no-data').show();
                }

                // screenshot callback
                arrays.takeScreenshot();

                // skip rendering the visualization
                return;
            }

            // hide loading template
            view.find('.gist-loading').hide();

            // show UI elements
            view.find('.gist-controls').show();

            view.find('.aggregation-params').show();

            // single result
            if (data.meta.numberOfResults === 1) {
                arrays.showSingleResultModal();
            }

            const treemap = new arrays.Treemap();

            function toggleAccesibility() {
                if (options.accessibility) {
                    view.find('.gist-accessibility-on').show();
                    view.find('.gist-accessibility-off').hide();
                } else {
                    view.find('.gist-accessibility-on').hide();
                    view.find('.gist-accessibility-off').show();
                }
            }

            toggleAccesibility();

            view.find('.gist-toggle-accessibility').click(() => {
                handleClickEvent('accessibility');
            });

            function handleClickEvent(option) {
                arrays.updateQuery(options, option, !options[option]);
                treemap.toggleBackgrounds(options.accessibility);
                toggleAccesibility();
            }

            const { MIN_CHART_HEIGHT_EXTENDED } = arrays.constants;
            const updateHeight = (height = MIN_CHART_HEIGHT_EXTENDED) => Math.max(height, MIN_CHART_HEIGHT_EXTENDED);

            function renderTreemap() {
                const treemapElement = view.find('.treemap');
                let height;

                if (options.isExternalAccess) {
                    const BOTTOM_MARGIN = 25;

                    height = updateHeight(parseInt(view.parent().css('height'), 10)) - BOTTOM_MARGIN;
                } else {
                    height = updateHeight(window.innerHeight - treemapElement.offset().top);
                }

                treemapElement.empty();
                treemapElement.height(height);

                const { isChartByPercent, isAggregateByPercent, isGroupByPercent, isSegmentBy } = data.meta;

                treemap
                    .init(data.graphData, {
                        ...options,
                        isChartByPercent,
                        isAggregateByPercent,
                        isGroupByPercent,
                        isSegmentBy,
                    })
                    .render(`${viewSelector} .treemap`);
            }

            arrays.addResizeEventListener(renderTreemap);

            // create pagination UI
            if (viewOptions.viewControls && !isExternalAccess) {
                new arrays.PaginationLimitDropdown().init(data, options).render('.pagination-limit-dropdown');

                new arrays.PaginationPageDropdown().init(data, options).render('.pagination-page-dropdown');
            }

            if (!isExternalAccess) {
                new arrays.PaginationNav().init(data, options).render('.gallery-pagination');
            }

            renderTreemap();

            // screenshot callback
            arrays.takeScreenshot();
            initScrollMagic(true);
        });
    }
})(window.arrays, window.jQuery, window.d3, window._);
