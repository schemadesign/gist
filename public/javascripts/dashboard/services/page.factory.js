(function () {
    angular
        .module('arraysApp')
        .factory('Page', Page);

    Page.$inject = ['$http', '$q'];

    function Page($http, $q) {

        const search = function (params) {
            return $http.get('api/page/search?slug=' + params.slug + '&team=' + params.team + '&website=' + params.website);
        };

        const update = function (params) {
            return $http.put('api/page/' + params._id, params);
        };

        const query = function () {
            return $http.get('api/page');
        };

        const remove = function (id) {
            return $http.delete('api/page/' + id.id);
        };

        const save = function (page) {
            return $http.post('api/page/', page);
        };

        // Not used anywhere
        const getAllPages = function (website_id) {
            return $http.get('/api/page/search/' + website_id);
        };

        const get = function (id) {
            return $http.get('/api/page/' + id);
        };

        const getTeamPages = function (team_id) {
            return $http.get('/api/page/team/' + team_id)
                .then(function (response) {
                    const data = response.data;
                    return data.pages;
                }).catch(function (err) {
                    console.log(err);
                    return [];
                });
        };

        const getSitePages = function (website_id, all, teamId) {
            const team = teamId ? `&teamId=${teamId}` : '';

            return $http.get(`/api/page/search/${website_id}?returnAll=${all}${team}`)
                .then(function (response) {
                    return response.data;
                }).catch(function (err) {
                    console.log(err);
                    return [];
                });
        };

        const deleteImage = function (params) {
            const deferred = $q.defer();
            $http.delete('api/page/deleteImage/' + params.id + '/' + params.folder + '/' + params.fileName)
                .then(function (response) {
                    return deferred.resolve(response.data);
                }, function (response) {
                    return deferred.reject(response.data.error);
                });
            return deferred.promise;
        };

        const approvalRequest = function (pageId, state) {
            return $http.put('api/page/approve/' + pageId, state);
        };

        return {
            search,
            update,
            query,
            remove,
            get,
            save,
            getAllPages,
            getTeamPages,
            getSitePages,
            deleteImage,
            approvalRequest,
        };
    }
})();
