function datasetTokenCheckCtrl($scope, $state, $window, User, Salesforce) {
    let fetchTimeout;
    const { type } = $state.params;
    const hasTypeToken = `has${_.capitalize(type)}Token`;
    const tokenCheckCtrl = this;

    tokenCheckCtrl.redirectLink = `/auth/${type}/redirect`;

    // Make sure that hasTypeToken is a valid field off $scope.user
    if (!_.has($scope.user, hasTypeToken)) {
        return $state.go('dashboard.dataset.one.upload');
    }

    const reloadUser = async () => {
        try {
            const user = await User.currentUser().$promise;

            if (!user[hasTypeToken]) {
                fetchTimeout = setTimeout(() => reloadUser(), 1000);
            } else {
                $state.go(`dashboard.dataset.one.upload.main.${type}`);
            }
        } catch (e) {
            fetchTimeout = setTimeout(() => reloadUser(), 1000);
        }

    };

    const redirect = (isValidToken = true) => {
        if (!$scope.user[hasTypeToken] || !isValidToken) {
            reloadUser();
            $window.open(this.redirectLink, '_blank');
        } else {
            $state.go(`dashboard.dataset.one.upload.main.${type}`);
        }
    };

    const validateToken = async () => {
        try {
            const { isValidToken } = await Salesforce.validateToken().$promise;

            redirect(isValidToken);
        } catch (e) {
            redirect(false);
        }

    };

    if ($scope.user[hasTypeToken] && type === 'salesforce') {
        validateToken();
    } else {
        redirect();
    }

    $scope.$on('$destroy', () => {
        clearTimeout(fetchTimeout);
    });
}

angular
    .module('arraysApp')
    .controller('DatasetTokenCheckCtrl', datasetTokenCheckCtrl);
