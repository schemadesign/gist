((arrays, $, initScrollMagic) => {
    Object.assign(arrays, {
        initGallery,
    });

    /**
     * External namespace for arrays classes
     * @external arrays
     */

    /**
     * Arrays Core view: Gallery
     */

    function initGallery(options) {
        const query = window.location.search;
        let apiRoute;

        if (options.sharedPage) {
            apiRoute = '/json-api/v1/sharedpages/' + options.sharedPageId + '/' + query;
        } else {
            apiRoute = '/json-api/v1/datasources/' + options.array_source_key + '/views/gallery/graph-data' + query;
        }

        $.get(apiRoute, function (data) {

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
            $('.filter-count').show();

            if (!options.puppeteer) {
                if (options.viewOptions.viewControls) {
                    new arrays.PaginationLimitDropdown()
                        .init(data, options)
                        .render('.pagination-limit-dropdown');

                    new arrays.PaginationPageDropdown()
                        .init(data, options)
                        .render('.pagination-page-dropdown');
                }

                new arrays.PaginationNav()
                    .init(data, options)
                    .render('.gallery-pagination');
            }

            new arrays.Gallery()
                .init(data, options)
                .render('#gallery');

            initScrollMagic();

            const images = $('#gallery .gist-image-with-fallback');

            arrays.checkForImageFallbacks({ options, images });
            arrays.checkForTitleOverflow();

            if (typeof window.callPhantom === 'function') {
                window.callPhantom('takeShot');
            }
        });
    }
})(window.arrays, window.jQuery, window.initScrollMagic);
