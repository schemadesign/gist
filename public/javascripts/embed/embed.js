/*
    Use this on the embedding site:
    <div class="arrays-embed" data-path="http://localhost:3000" data-element="chart1" data-width="200" data-height="200"></div>
    <script async src="http://localhost:3000/dist/embed.js" charset="utf-8"></script>
*/

(function () {

    // Only load script once if multiple script tags on page
    if (window.arraysEmbedScriptLoaded === true) {
        return false;
    }
    window.arraysEmbedScriptLoaded = true;

    // Replaces jQuery $(document).ready function (Supports IE9+)
    var domReady = function (callback) {
        document.readyState === 'interactive' || document.readyState === 'complete' ? callback() : document.addEventListener('DOMContentLoaded', callback);
    };

    domReady(function () {

        function forEachElement (selector, fn) {
            var elements = document.querySelectorAll(selector);
            for (var i = 0; i < elements.length; i++) {
                fn(elements[i], i);
            }
        }

        forEachElement('.arrays-embed', function (el, i) {
            var path = el.getAttribute('data-path');
            var element = el.getAttribute('data-element');
            var width = el.getAttribute('data-width');
            var height = el.getAttribute('data-height');

            // initialize iframe
            var iframe = document.createElement('iframe');
            iframe.src = path + '?embed=' + encodeURIComponent(element);
            iframe.class = 'arrays-iframe';
            iframe.width = width;
            iframe.height = height;
            iframe.style.display = 'none';

            // Empty container
            while (el.firstChild) {
                el.removeChild(el.firstChild);
            }

            // Append iframe to the embed container
            el.appendChild(iframe);

            iframe.onload = function () {

                // Show iframe
                iframe.style.display = 'block';
                iframe.style.border = '0';
            };
        });
    });

    return true;

})();
