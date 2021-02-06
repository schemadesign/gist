angular
    .module('arraysApp')
    .controller('UserCtrl', ['$scope', '$state',
        function($scope, $state) {

            $scope.primaryAction = {
                disabled: true
            };

        }]);
