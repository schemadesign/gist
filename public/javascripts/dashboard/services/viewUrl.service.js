angular
    .module('arraysApp')
    .service('viewUrlService', ['$window', function ($window) {

        function makeQuery(queryObject) {
            var queryValuePairs = [];
            var query = '';

            for (var key in queryObject) {
                if (queryObject.hasOwnProperty(key)) {
                    queryValuePairs.push(key + '=' + queryObject[key]);
                }
            }

            query = queryValuePairs.join('&');

            if (query !== '') {
                query = '?' + query;
            }

            return query;
        }

        function constructQueryObject(args) {
            var queryObject = {};
            if (args.dataset.fe_filters && args.dataset.fe_filters.default && Object.keys(args.dataset.fe_filters.default).length > 0) {
                queryObject = angular.copy(args.dataset.fe_filters.default);
            }
            if (args.showPreview) {
                queryObject.preview = true;
            }

            // Add revision when processing previousDataset (no _id is given)
            if (args.dataset.importRevision > 1 || !args.dataset._id) {
                queryObject.revision = args.dataset.importRevision;
            }

            return makeQuery(queryObject);
        }

        this.getViewUrl = function (subdomain, dataset, viewName, showPreview) {
            var args = {
                dataset: dataset,
                showPreview: showPreview,
            };
            var view = !_.isNil(viewName) ? '/' + _.kebabCase(viewName) : '';
            var query = constructQueryObject(args);
            return subdomain + '/' + dataset.uid + view + query;
        };

        this.draftUrl = function (url) {
            return url + '&draft=true';
        };

        this.openViewUrl = function (subdomain, dataset, viewName, showPreview = false) {
            viewName = viewName === 'timeline' ? 'grouped-gallery' : viewName;
            var url = this.getViewUrl(subdomain, dataset, viewName, showPreview);

            // Set a window name over '_blank' so multiple clicks of the same dataset/view don't open excessive tabs
            var windowName = dataset.uid + '_' + viewName;
            $window.open(url, windowName);
        };

    }]);
