angular.module('arraysApp')
    .controller('AddTeamDialogController', ['$scope', '$mdDialog', '$mdToast', 'Team', 'user',
        function ($scope, $mdDialog, $mdToast, Team, user) {
            $scope.newTeam = {};
            $scope.newTeam.admin = [user._id];
            $scope.host = window.location.host.replace('app.', '');
            $scope.hide = function() {
                $mdDialog.hide();
            };
            $scope.cancel = function() {
                $mdDialog.cancel();
            };

            $scope.checkSubdomain = function() {
                var params = { subdomain: $scope.newTeam.subdomain };
                if ($scope.newTeam.subdomain == 'app') {
                    $scope.vm.teamForm.subdomain.$setValidity('unique', false);
                    return;
                }
                Team.search(params)
                    .$promise.then(function(data) {

                        if (data.length == 0) {

                            if (/^[a-z0-9]*$/.test($scope.newTeam.subdomain)) {
                                $scope.vm.teamForm.subdomain.$setValidity('unique', true);
                                $scope.vm.teamForm.subdomain.$setValidity('pattern', true);
                            } else {
                                $scope.vm.teamForm.subdomain.$setValidity('unique', true);
                                $scope.vm.teamForm.subdomain.$setValidity('pattern', false);
                            }

                        } else {
                            $scope.vm.teamForm.subdomain.$setValidity('unique', false);
                        }
                    }, function(err) {});
            };

            $scope.createTeam = function() {
                if ($scope.newTeam.isEnterprise == true) {
                    $scope.newTeam.superTeam = true;
                }
                var team = new Team($scope.newTeam);
                team.$save(function(team) {

                    $mdToast.show(
                        $mdToast.simple()
                            .textContent('New team created!')
                            .position('top right')
                            .hideDelay(3000)
                    );

                    $mdDialog.hide(team);

                }, function(err) {
                    $mdToast.show(
                        $mdToast.simple()
                            .textContent(err.message)
                            .position('top right')
                            .hideDelay(3000)
                    );
                });
            };
        }
    ]);
