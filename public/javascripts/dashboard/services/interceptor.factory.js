function TokenInterceptor($q, $window, $injector, $state) {
    return {
        request(config) {
            if (config.url.includes('api') && !config.url.includes('currentUser')) {
                const token = $injector.get('AuthService').getToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            }

            return config;
        },

        responseError(rejectedResponse) {
            if (rejectedResponse.status === 401 && _.get(rejectedResponse, 'data.error') === 'session expired') {
                $state.go('dashboard.dataset.error', {
                    id: $state.params.id,
                    type: 'loggedOut',
                    returnTo: $state.current.name,
                });
            }

            return $q.reject(rejectedResponse);

        },
        response(response) {
            return response || $q.when(response);
        },
    };
}

angular.module('arraysApp')
    .factory('TokenInterceptor', TokenInterceptor);
