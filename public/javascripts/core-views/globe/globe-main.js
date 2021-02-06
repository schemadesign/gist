((arrays, $) => {
    Object.assign(arrays, {
        initGlobe,
    });

    /**
     * External namespace for arrays classes
     * @external arrays
     */

    /**
     * Arrays Core view: Globe
     */

    function initGlobe(options) {
        const query = window.location.search;
        let apiRoute;

        if (options.sharedPage) {
            apiRoute = '/json-api/v1/sharedpages/' + options.sharedPageId + '/';
        } else {
            apiRoute = '/json-api/v1/datasources/' + options.array_source_key + '/views/globe/graph-data';
        }

        $.get(apiRoute + query, function (data) {

            // no data
            if (data.meta.numberOfResults === 0) {
                // hide loading template
                $('.gist-loading').hide();

                // show no-data template
                $('.gist-no-data').show();

                // screenshot callback
                if (typeof window.callPhantom === 'function') {
                    window.callPhantom('takeShot');
                }

                // skip rendering the visualization
                return;
            }

            // hide loading template
            $('.gist-loading').hide();

            // show UI elements
            $('.gist-controls').show();

            // resize #globe to fill window
            function resizeContainer() {
                const mapContainer = document.getElementsByClassName('map-container')[0];
                mapContainer.style.height = window.innerHeight - mapContainer.offsetTop + 'px';
            }

            resizeContainer();

            arrays.addResizeEventListener(resizeContainer);

            options.brandColor = data.meta.pointColor;

            new arrays.Globe()
                .init(data.graphData, options)
                .render('#globe');

            if (options.isPreview && data.meta.truncatedDataWarnings && data.meta.truncatedDataWarnings.length > 0) {
                const $warnings = $('#globe-warnings');
                $warnings.show();
                const $warningsTitle = $warnings.children('h4');
                const $warningsList = $warnings.children('ul');
                $warningsTitle.html('Warnings');
                data.meta.truncatedDataWarnings.forEach(function (warning) {
                    $warningsList.append('<li class="warnings-list-item">' + warning + '</li>');
                });
            }
        });
    }
})(window.arrays, window.jQuery, window.initScrollMagic);
