$(function () {

    // Use with a param on the URL, e.g. http://localhost:3000/?embed=chart1
    isolateElement();

});

function urlParam (name) {
    var results = new RegExp('[?&]' + name + '=([^]*)').exec(window.location.href);
    if (results === null) {
        return null;
    } else {
        return results[1] || 0;
    }
}

function isolateElement () {
    var param = urlParam('embed');

    if (param !== '') {

        var embedContainer = $('#' + param);

        // first check if the div exists, and return if not
        if (embedContainer.length === 0) {
            return;
        }

        // Expand card accordion when it has finished loading in
        $(document).on('visualizations-loaded', function () {
            embedContainer.find('.crd-content').css('height', 'auto');
        });

        // var $element = embedContainer.detach();
        //$('#page').find('#masthead, #colophon, aside, .photo-credit, #reforms, .reform-content > :not(#' + param + '), .reform-content > :not(#' + param + ') *').remove();

        // Hide everything but the selected chart
        $('head').append('<style type="text/css">#masthead, #colophon, aside, .photo-credit, #reforms, .reform-content > :not(#' + param + ') { display: none !important; } .gist-site-content, .site-main { padding: 0 !important; } .crd-header { margin-top: 0 !important; margin-bottom: 0 !important; } .reform-main { margin: 0 !important; }</style>');
    }
}
