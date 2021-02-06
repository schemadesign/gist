((arrays, $, initScrollMagic) => {
    Object.assign(arrays, {
        initTimeline,
    });

    /**
     * External namespace for arrays classes
     * @external arrays
     */

    /**
     * Arrays Core view: Treemap
     */

    function initTimeline(options) {
        var query = window.location.search;
        var apiRoute;

        if (options.sharedPage) {
            apiRoute = '/json-api/v1/sharedpages/' + options.sharedPageId + '/';
        } else {
            apiRoute = '/json-api/v1/datasources/' + options.array_source_key + '/views/timeline/graph-data';
        }

        $.get(apiRoute + query, function (data) {

            if (data.data.length === 0) {
                $('.gist-loading').hide();

                $('.gist-no-data').show();

                if (typeof window.callPhantom === 'function') {
                    window.callPhantom('takeShot');
                }

                return;
            }

            $('.gist-loading').hide();

            $('.gist-controls').show();

            if (!options.puppeteer) {
                if (options.viewOptions.viewControls) {
                    const resultsLabels = ['Group', 'Groups'];
                    const paginationLimitOptions = Object.assign({}, options, { resultsLabels });

                    new arrays.PaginationLimitDropdown()
                        .init(data, paginationLimitOptions)
                        .render('.pagination-limit-dropdown');

                    new arrays.PaginationPageDropdown()
                        .init(data, options)
                        .render('.pagination-page-dropdown');
                }

                new arrays.PaginationNav()
                    .init(data, options)
                    .render('.timeline-pagination');
            }

            const {isGroupByPercent, isSortByPercent} = data.meta;

            new arrays.Timeline()
                .init(data, {
                    ...options,
                    isGroupByPercent,
                    isSortByPercent,
                })
                .render('#timeline');

            initScrollMagic();

            const images = $('#timeline .gist-image-with-fallback');

            arrays.checkForImageFallbacks({ options, images });
            arrays.checkForTitleOverflow();

            if (typeof window.callPhantom === 'function') {
                window.callPhantom('takeShot');
            }
        });
    }
})(window.arrays, window.jQuery, window.initScrollMagic);
