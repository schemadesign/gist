angular.module('arraysApp')
    .controller('PageMarkdownDisplayCtrl', ['$scope', '$state', '$q', 'AuthService', '$mdToast', '$window', '$rootScope', 'Page', 'page', 'user',
        function ($scope, $state, $q, AuthService, $mdToast, $window, $rootScope, Page, page, user) {

            $scope.user = user;
            $scope.$parent.$parent.currentNavItem = 'display';
            $scope.page = page;
            $scope.$parent.$parent.page = $scope.page;
            $scope.primaryAction.text = 'Save';
            $scope.primaryAction.disabled = false;

            $scope.primaryAction.do = function(ev) {
                $scope.submitForm();
            };

            $scope.secondaryAction.text = 'Cancel';
            $scope.secondaryAction.disabled = false;

            $scope.secondaryAction.do = function (ev) {
                $scope.revertChanges(true);
            };

            $scope.thirdAction.text = 'Back';
            $scope.thirdAction.disabled = false;

            $scope.thirdAction.do = function (ev) {
                if (!$scope.$parent.$parent.prevStep) {
                    $scope.$parent.$parent.prevStep = 'dashboard.dataset.list';
                }
                $state.go($scope.$parent.$parent.prevStep, { site_id: $scope.page.website._id });
            };

            $scope.primaryAction.do = function(ev) {
                $scope.submitForm($scope);
            };

            // Show Save and Cancel buttons after page has been edited
            $scope.$watch('markdownDisplayForm.$dirty', function (newValue, oldValue, scope) {
                $scope.primaryAction.text = scope.markdownDisplayForm.$dirty ? 'Save' : '';
                $scope.secondaryAction.text = scope.markdownDisplayForm.$dirty ? 'Cancel' : '';
            });

            $scope.revertChanges = function(onPage) {
                $mdToast.show(
                    $mdToast.simple()
                        .textContent('Changes reverted.')
                        .position('top right')
                        .hideDelay(3000)
                );

                if (onPage) {
                // simplest way to refresh page content, although causes flash
                // TODO reset view visibiliy checkboxes and default view indicators
                    $state.reload();
                }
            };

            $scope.submitForm = function($scope) {
                Page.update($scope.page).then(function(page) {

                    $mdToast.show(
                        $mdToast.simple()
                            .textContent('Page has been saved!')
                            .position('top right')
                            .hideDelay(3000)
                    );

                    $scope.markdownDisplayForm.$setPristine();
                }, function(err) {
                    $mdToast.show(
                        $mdToast.simple()
                            .textContent(err.message)
                            .position('top right')
                            .hideDelay(3000)
                    );
                });
            };

            $scope.listOnArraysRequest = function() {
                Page.approvalRequest(page._id, { state: 'pending' })
                    .then(function(response) {
                        if (response.status == 200) {
                            $scope.page.state = 'pending';
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent('Request submitted!')
                                    .position('top right')
                                    .hideDelay(3000)
                            );
                        }
                    });
            };

            $scope.updateListingOnArrays = function(approved) {
                var appr = (approved == true) ? 'approved' : 'disapproved';
                Page.approvalRequest(page._id, { state: appr })
                    .then(function(response) {
                        if (response.status == 200) {
                            $scope.page.state = appr;
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent('Listing status updated!')
                                    .position('top right')
                                    .hideDelay(3000)
                            );

                        }
                    });

            };
        }
    ]);
