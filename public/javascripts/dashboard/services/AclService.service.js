(function () {
    angular
        .module('arraysApp')
        .service('AclService', AclService);

    AclService.$inject = ['$window', '$http', 'Team', 'User', 'DatasetService', '$mdToast'];

    function AclService($window, $http, Team, User, DatasetService, $mdToast) {
        var checked = 0;

        var setAllInStorage = function(entity, permissions) {
            $window.sessionStorage.setItem(entity, JSON.stringify(permissions));
        };

        var can = function(entity, action) {
            var permissions = entity + 'Permissions';
            var sessionPermissions = $window.sessionStorage[permissions];

            if (!sessionPermissions) {
                // only return this error once - sometimes 'can' is called 5 times in a row.
                // checked prevents the toast from popping up all 5 times
                checked++;
                if (checked === 1 && $window.sessionStorage.length) {
                    $mdToast.show(
                        $mdToast.simple()
                            .textContent('Something went wrong. Try refreshing the page.')
                            .position('top right')
                            .hideDelay(5000)
                    );
                }
                return false;
            }
            return sessionPermissions.indexOf(action) > -1;
        };

        var set = function(entity, action) {

        };

        var setAllFor = function(entity, id, type) {
            // switch case entity
            switch (entity) {
                case 'dataset':
                    return $http.post('/api/permissions/dataset', {
                        id: id,
                        type: type
                    }).then(function(result) {
                        setAllInStorage('datasetPermissions', result.data.permissions);
                    }).catch(function(err) {
                        console.log(err);
                    });
            }
        };

        var getAllFor = function(entity, id, role) {

            switch (entity) {
                case 'dataset':
                    return $http.get('/api/permissions/dataset/' + id)
                        .then(function(result) {
                            return result.data.permissions;
                        }).catch(function(err) {
                            console.error('could not get dataset permissions');
                            console.log(err);
                            return [];
                        });
                case 'user':
                    var route = '/api/permissions/user/' + id + '/' + role;
                    return $http.get(route)
                        .then(function(result) {
                            return result.data.permissions;
                        }).catch(function(err) {
                            console.error('could not get user permissions');
                            console.log(err);
                            return [];
                        });
                case 'team':
                    return $http.get('/api/permissions/team/' + id)
                        .then(function(result) {
                            return result.data.permissions;
                        }).catch(function(err) {
                            console.error('could not get team permissions');
                            console.log(err);
                            return [];
                        });
            }
        };

        return {
            setAllFor: setAllFor,
            getAllFor: getAllFor,
            setAllInStorage: setAllInStorage,
            set: set,
            can: can
        };
    }
})();
