angular.module('arraysApp')
    .controller('PageCtrl', ['$scope', '$state', '$rootScope',
        function ($scope, $state, $rootScope) {
            $scope.currentStep = $state.current.name;

            /**
             * @deprecated State Change Events were deprecated in UI-Router 1.0 but are supported via polyfill
             * See https://ui-router.github.io/guide/ng1/migrate-to-1_0#state-change-events
             */
            //Keep track of state when navigating without breadcrumbs
            $rootScope.$on('$stateChangeStart',
                function (event, toState) {
                    $scope.currentStep = toState.name;
                },
            );


            $scope.primaryAction = {
                disabled: false,
                text: 'New Page',
                do: function () {

                },
            };

            $scope.secondaryAction = {
                disabled: false,
                text: 'Cancel',
                do: function () {

                },
            };

            $scope.thirdAction = {
                disabled: false,
                text: 'Back',
                do: function () {

                },
            };

            $scope.pageIsAvailable = function (id) {

                if (!$scope.pages) {
                    return;
                }

                var matchedPages = $scope.pages.filter(function (el) {
                    return el.website === id;
                });

                if (matchedPages.length > 0) {
                    return true;
                }

                return false;
            };


            $scope.navigate = function (step) {
                $scope.previousStep = 'dashboard.page.list';
                $scope.currentStep = step;

                switch (step) {
                    case 'dashboard.page.markdown.content':
                        if ($scope.page._id) {
                            $state.go(step, { id: $scope.page._id });
                        }
                        break;
                    case 'dashboard.page.markdown.display':
                        if ($scope.page._id) {
                            $state.go(step, { id: $scope.page._id });
                        }
                        break;
                    case 'dashboard.page.markdown.settings':
                        if ($scope.page._id) {
                            $state.go(step, { id: $scope.page._id });
                        }
                        break;
                }
            };


        }]);
