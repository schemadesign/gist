angular.module('arraysApp')
    .controller('AccountCtrl', ['$scope', 'AuthService', '$state', 'User', '$mdToast',
        function($scope, AuthService, $state, User, $mdToast) {

            //profile or password
            $scope.currentNavItem = $state.current.url.slice(1, $state.current.url.length);
            $scope.user = AuthService.currentUser();


            $scope.updateProfile = function() {
                // AuthService.updateProfile($scope.userFormData)
                //     .then(function(msg) {
                //         $scope.message = msg;
                //     }, function(err) {
                //         $scope.error = err;
                //     });
            };


            $scope.resetPassword = function() {

                User.updateProfile({ id: $scope.user._id }, { password: $scope.password })
                    .$promise.then(function(response) {
                        $scope.user = response;
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Password updated!')
                                .position('top right')
                                .hideDelay(3000)
                        );

                    });


            };
        }
    ]);
