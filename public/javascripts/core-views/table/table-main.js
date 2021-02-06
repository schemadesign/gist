((arrays, $, initScrollMagic) => {
    Object.assign(arrays, {
        initTable,
    });

    /**
     * External namespace for arrays classes
     * @external arrays
     */

    /**
     * Arrays Core view: Table
     */

    function initTable(options) {

        var query = window.location.search;
        var apiRoute;

        if (options.sharedPage) {
            apiRoute = '/json-api/v1/sharedpages/' + options.sharedPageId + '/';
        } else {
            apiRoute = '/json-api/v1/datasources/' + options.array_source_key + '/views/table/graph-data';
        }

        $.get(apiRoute + query, function (data) {

            // no data
            if (data.data.length === 0) {
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
            $('.filter-count').show();

            // create pagination UI
            if (!options.puppeteer) {
                var limitDropdown,
                    pageDropdown,
                    nav;

                if ($('.pagination-limit-dropdown').length) {
                    limitDropdown = new arrays.PaginationLimitDropdown()
                        .init(data, options)
                        .render('.pagination-limit-dropdown');
                }
                pageDropdown = new arrays.PaginationPageDropdown()
                    .init(data, options)
                    .render('.pagination-page-dropdown');
                nav = new arrays.PaginationNav()
                    .init(data, options)
                    .render('.table-pagination');
            }

            // create table
            var table = new arrays.CoreTable()
                .init(data, options)
                .render('#table');

            // Init scroll magic
            initScrollMagic();

            function searchAndUpdate(searchParam, searchValue, $thisFilter, callback) {

                // searchParam required
                if (!searchParam) {
                    console.warn('Warning: searchParam required; skipping searchAndUpdate');
                    return;
                }

                // Clear other search fields
                if ($thisFilter) {
                    var $otherFilters = $filters.filter(function (i) {
                        return $filters.eq(i)[0] !== $thisFilter[0];
                    });

                    $otherFilters.val('');
                }

                const { filters, toOmit } = searchValue ?
                    { filters: { searchCol: searchParam, searchQ: searchValue }, toOmit: ['page'] } :
                    { filters: {}, toOmit: ['searchCol', 'searchQ', 'page'] };

                const uri = arrays.changeRoutePath('', '', filters, toOmit);
                window.history.replaceState({}, '', uri);

                // update the query
                query = window.location.search;

                // re-fetch the data
                $.get(apiRoute + query, function (data) {

                    // replace the data in the table
                    table.replaceData(data, false);

                    // replace the data in the pagination components
                    limitDropdown.replaceData(data);
                    pageDropdown.replaceData(data);
                    nav.replaceData(data);

                    if (callback) {
                        // create a unique array based on the returned Titles
                        // this is what populates the suggestions popup
                        var suggestions = data.data.map(function (d) {
                            if (d.rowParams[searchParam] instanceof Array) {
                                return d.rowParams[searchParam][0];
                            } else {
                                return d.rowParams[searchParam];
                            }
                        });
                        suggestions = _.uniq(suggestions);

                        // actually show the autocomplete
                        callback(suggestions);
                    }
                });
            }

            // Init autocomplete table column filters
            var $filters = $('#table .table-column-filter');
            $filters.each(function (index) {

                // the filter <input> element
                var $filter = $(this);

                // instantiate the jQuery UI autocomplete
                $filter.autocomplete({
                    source: function (request, response) {
                        searchAndUpdate($filter.attr('id'), request.term, $filter, response);
                    },

                    minLength: 1,

                    select: function (event, ui) {
                        searchAndUpdate($filter.attr('id'), ui.item.value, $filter);
                    },
                });

                // catch additional cases that clear the input
                $filter.on('input', function () {
                    if (!this.value) {
                        searchAndUpdate($filter.attr('id'), null, $filter);
                    }
                });
            });

            // screenshot callback
            if (typeof window.callPhantom === 'function') {
                window.callPhantom('takeShot');
            }

        });
    }
})(window.arrays, window.jQuery, window.initScrollMagic);
