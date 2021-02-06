(function () {
    angular
        .module('arraysApp')
        .factory('JsonApi', ['$http',
            function ($http) {
                const share = function (params) {
                    return $http.post('/json-api/v1/share', params);
                };

                return {
                    share,
                };
            }]);
})();
