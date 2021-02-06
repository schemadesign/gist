/* global arrays, options */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Arrays Core view: WordCloud
 */

$(document).ready(function() {
    var query = window.location.search;
    var apiRoute;

    if (options.sharedPage) {
        apiRoute = '/json-api/v1/sharedpages/' + options.sharedPageId + '/';
    } else {
        apiRoute = '/json-api/v1/datasources/' + options.array_source_key + '/views/word-cloud/graph-data';
    }

    $.get(apiRoute + query, function(data) {
        // no data
        if (data.data.length === 0) {
            // hide loading template
            $('.gist-loading').hide();

            // show no-data template
            if (data.meta.hasKeywords) {
                $('.gist-no-data').show();
            } else {
                $('.gist-undisplayable-data').show();
            }

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

        // create word-cloud
        var wordCloud = new arrays.CoreWordCloud().init(data, options).render('#word-cloud');

        // Additional

        // screenshot callback
        if (typeof window.callPhantom === 'function') {
            window.callPhantom('takeShot');
        }

        initScrollMagic(true);
    });
});
