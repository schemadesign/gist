angular
    .module('arraysApp')
    .service('Loader', function ($rootScope) {
        const buildRegexp = _.memoize(state =>
            new RegExp(`^${state.replace(/\./g, '\\.').replace('*', '[^.]*').replace('**', '.*')}$`)
        );

        this.isLoading = (state = '**') => buildRegexp(state).test($rootScope._loading);
    });
