(function () {
    var signupModule = angular.module('signupModule');
    signupModule.factory('User', function ($resource) {
        return $resource('/api/user/:id', { id: '@_id' },
            {
                search: { url: '/api/user/searchEmail', method: 'GET', isArray: true },
                update: { method: 'PUT' },
                resetPassword: { method: 'get', url: '/api/user/:email/reset' },
                updateProfile: { method: 'put', url: '/api/user/:id/updateProfile' },
                resendActivation: { method: 'get', url: '/api/user/:id/resend?emailType=activation' },
                resendInvite: { method: 'get', url: '/api/user/:id/resend?Invitee=:invitee' },
                getEmail: { method: 'get', url: '/api/user/:id/email' },
            },
        );
    });

    signupModule.factory('Team', function ($resource) {

        return $resource('/api/team/:id', { id: '@_id' }, {
            search: {
                url: '/api/team/search',
                method: 'GET',
                isArray: true,
            },
        });
    });

    signupModule.factory('Token', $resource => $resource('/api/token', { id: '@_id' }, {
        validate: {
            url: '/api/token/:token',
            method: 'GET',
        },
    }));

    signupModule.service('ENV', function ($http, $q) {

        var getEnv = function () {
            var deferred = $q.defer();
            $http.get('/env')
                .then(function (result) {
                    var env = result.data;
                    if (env) {
                        deferred.resolve(env);
                    } else {
                        deferred.reject();
                    }
                });
            return deferred.promise;

        };

        return {
            get: getEnv,
        };

    });

})();
