/* global arrays, options */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Arrays Core view: Regional Map
 */

$(document).ready(function() {
    const query = window.location.search;
    const view = $('.gist-section');
    const sharedPageRoute = `/json-api/v1/sharedpages/${options.sharedPageId}/${query}`;
    const dataSourceRoute = `/json-api/v1/datasources/${options.array_source_key}/views/regional-map/graph-data${query}`;
    const apiRoute = options.sharedPage ? sharedPageRoute : dataSourceRoute;

    $.get(apiRoute, function(data) {
        const SEPARATOR = '/';
        const EMBEDDED_RATIO = 0.6;
        const DEFAULT_VIEW_SIZE = 960;
        const VIEW_BOX_HEIGHTS = {
            US: 520,
            EU: 720,
            ASEAN: 720,
        };

        const { meta = {} } = data;

        view.find('.gist-loading').hide();

        if (meta.numberOfResults === 0) {
            view.find('.gist-no-data').show();
            arrays.takeScreenshot();
            return;
        }

        if (options.puppeteer) {
            view.find('.gist-controls').hide();
        }

        if (options.accessibility) {
            view.find('.gist-accessibility-on').show();
            view.find('.gist-accessibility-off').hide();
        } else {
            view.find('.gist-accessibility-on').hide();
            view.find('.gist-accessibility-off').show();
        }

        view.find('.gist-toggle-accessibility').click(function() {
            handleClickEvent('accessibility');
        });

        function renderMap() {
            const { isAggreagtedByPercent } = meta;

            new arrays.CoreRegionalMap()
                .init(data.graphData, {
                    ...options,
                    isAggreagtedByPercent,
                })
                .render('#regional-map');
        }

        function handleClickEvent(option) {
            arrays.updateQuery(options, option, !options[option]);

            d3.selectAll('.gist-legend-list-item').remove();
            view.find('.gist-visualization-container').remove();

            renderMap();
        }

        if (data.meta.numberOfResults === 1) {
            arrays.showSingleResultModal();
        }

        function resizeContainer() {
            const container = view.find('.regional-map');
            const maxHeight = options.isEmbed
                ? arrays.getParentHeight() * EMBEDDED_RATIO
                : window.innerHeight - container.offset().top;

            if (arrays.isMobileBreakpoint()) {
                const width = view.find('.gist-visualization').width();
                const scale = width / DEFAULT_VIEW_SIZE;
                const item = view.find('.gist-visualization-canvas');

                if (item.length) {
                    const itemHeight = item[0].getBBox().height * scale;
                    const height = Math.min(itemHeight, maxHeight);

                    container.height(`${height}px`);
                }
            } else {
                container.height(`${maxHeight}px`);
            }
        }

        arrays.addResizeEventListener(resizeContainer, true);

        const region = meta.region.indexOf(SEPARATOR) >= 0 ? meta.region.split(SEPARATOR)[0] : meta.region;

        options.viewBoxWidth = DEFAULT_VIEW_SIZE;
        options.viewBoxHeight = VIEW_BOX_HEIGHTS[region] || DEFAULT_VIEW_SIZE;

        options.regionField = meta.regionField;
        options.parentRegionField = meta.parentRegionField;
        options.grandparentRegionField = meta.grandparentRegionField;

        renderMap();
        resizeContainer();

        // if preview and warnings exist, surface helpful information about missing / mismatched data
        if (options.isPreview) {
            const $warnings = view.find('#regional-map-warnings');
            const $warningsTitle = $warnings.children('h4');
            const $warningsList = $warnings.children('ul');

            const { missingDataWarnings = [], unusedDataWarnings = [] } = meta;
            const messages = [...missingDataWarnings, ...unusedDataWarnings];

            if (messages.length) {
                $warningsTitle.html('Warnings');
                $warnings.css('display', 'block');

                messages.forEach(warning => {
                    $warningsList.append(`<li class="warnings-list-item">${warning}</li>`);
                });
            }
        }

        arrays.takeScreenshot();
        initScrollMagic();
    }).fail(function() {
        view.find('.gist-loading').hide();
        view.find('.gist-undisplayable-data').show();
    });
});
