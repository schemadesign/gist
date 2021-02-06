angular.module('arraysApp').controller('EditTeamDialogController', [
    '$scope',
    '$mdDialog',
    '$mdToast',
    'Team',
    'team',
    'index',
    'teams',
    'user',
    function($scope, $mdDialog, $mdToast, Team, team, index, teams, user) {
        $scope.team = team;
        $scope.user = user;
        const { datasourceDescriptions } = $scope.team;
        const filteredDataSourceDescriptions = _.filter(
            datasourceDescriptions,
            ({ replaced, master_id, schema_id }) => !replaced && !master_id && !schema_id
        );
        const lastUpdatedViz = _.maxBy(filteredDataSourceDescriptions, 'updatedAt');
        const updatedAt = _.get(lastUpdatedViz, 'updatedAt', team.updatedAt);
        $scope.updatedAt = moment(updatedAt).format('D MMMM YYYY');
        $scope.visualisationsCount = filteredDataSourceDescriptions.length;
        $scope.hide = function() {
            $mdDialog.hide(teams);
        };
        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.updateSuperTeam = function() {
            Team.update({ id: team._id }, { superTeam: team.superTeam }).$promise.then(function(response) {
                if (response.team) {
                    $mdToast.show(
                        $mdToast
                            .simple()
                            .textContent('Team setting saved!')
                            .position('top right')
                            .hideDelay(3000)
                    );
                    teams[index] = team;
                } else {
                    $mdToast.show(
                        $mdToast
                            .simple()
                            .textContent('Error. Cannot save team setting.')
                            .position('top right')
                            .hideDelay(3000)
                    );
                }
            });
        };

        $scope.deleteTeam = function() {
            // Close the edit dialog
            $mdDialog.cancel();

            //show warning, ask for confirmation
            var teamId = team._id;

            function deleteTeamCtrl($scope, $mdDialog, teamName) {
                $scope.teamName = teamName;

                $scope.hide = function() {
                    $mdDialog.hide();
                };
                $scope.cancel = function() {
                    $mdDialog.cancel();
                };
            }

            deleteTeamCtrl.$inject = ['$scope', '$mdDialog', 'teamName'];

            $mdDialog
                .show({
                    templateUrl: 'templates/blocks/team.delete.html',
                    clickOutsideToClose: true,
                    fullscreen: true,
                    controller: deleteTeamCtrl,
                    locals: {
                        teamName: team.title,
                    },
                })
                .then(
                    function() {
                        Team.delete({ id: teamId }).$promise.then(function(response) {
                            if (response.message == 'ok') {
                                teams.splice(index, 1);
                            }
                        });
                    },
                    function() {
                        //dialog canceled
                    }
                );
        };
    },
]);
