angular.module('arraysApp')
    .controller('PageMarkdownSettingsCtrl', ['$scope', '$state', '$q', 'AuthService', '$mdToast', '$window', '$rootScope', 'Page', 'page',
        function ($scope, $state, $q, AuthService, $mdToast, $window, $rootScope, Page, page) {

            $scope.$parent.$parent.currentNavItem = 'settings';
            $scope.$parent.$parent.page = page;

            $scope.primaryAction.text = 'Next';
            $scope.primaryAction.disabled = false;

            $scope.primaryAction.do = function(ev) {
                $scope.submitForm($scope);
            };

            $scope.submitForm = function($scope) {

            };


        }
    ]);
