angular.module('arraysApp')
    .controller('SiteCtrl', ['$scope', '$state', '$rootScope', '$mdToast',
        function ($scope, $state, $rootScope, $mdToast) {

        /**
         * @deprecated State Change Events were deprecated in UI-Router 1.0 but are supported via polyfill
         * See https://ui-router.github.io/guide/ng1/migrate-to-1_0#state-change-events
         */
        //Keep track of state when navigating without breadcrumbs
            $rootScope.$on('$stateChangeStart', function(event, toState) {
                $scope.currentStep = toState.name;
            });

            $scope.primaryAction = {
                disabled: false,
                text: 'New Site',
                do: function() {}
            };

            $scope.secondaryAction = {
                disabled: false,
                text: 'Cancel',
                do: function() {}
            };

            $scope.thirdAction = {
                disabled: false,
                text: 'Back',
                do: function() {}
            };

            // Share with child controllers
            $scope.genericError = function(err) {
                console.log(err);

                $mdToast.show(
                    $mdToast.simple()
                        .textContent('There was an error')
                        .position('top right')
                        .hideDelay(3000)
                );
            };
        }
    ]);
