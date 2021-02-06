(function() {
    angular.module('arraysApp').factory('Website', [
        '$http',
        function($http) {
            var get = function(params) {
                var site_id = params.site_id;
                return $http.get(`/api/website/${site_id}?app=true`);
            };

            var getBySubdomain = function(params) {
                var team_id = params.team_id;
                var subdomain = params.subdomain;
                return $http.get('/api/website/search/' + team_id + '/' + subdomain);
            };

            var getTeamSites = function(params) {
                var allSites = params.allSites;
                return $http.get('/api/website/team-search/?allSites=' + allSites);
            };

            var search = function(params) {
                var query = '?';

                // loop through params and construct query
                for (var key in params) {
                    query += key + '=' + params[key] + '&';
                }

                // trim the extra '&'
                query = query.substring(0, query.length - 1);
                return $http.get('/api/website/search' + query);
            };

            var update = function(params) {
                return $http.put('/api/website/update', params);
            };

            var remove = function(params) {
                var id = params.id;
                return $http.delete('/api/website/' + id);
            };

            var save = function(params) {
                return $http.post('/api/website', params);
            };

            return {
                get,
                getBySubdomain,
                getTeamSites,
                search,
                update,
                remove,
                save,
            };
        },
    ]);
})();
