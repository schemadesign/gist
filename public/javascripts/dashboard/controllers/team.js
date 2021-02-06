angular
    .module('arraysApp')
    .controller('TeamCtrl', ['$scope', '$state', 'AuthService', 'Team', '$mdToast', '$mdDialog', '$window',
        ($scope, $state, AuthService, Team, $mdToast, $mdDialog, $window) => {
            const {SORT_BY} = window.arrays.constants;

            $scope.teams.sortBy = SORT_BY.TITLE;
            $scope.filterTeams = '';
            let teamCopy = angular.copy($scope.teams);

            $scope.isUnusedTeam = ({ updatedAt: teamUpdatedAt, datasourceDescriptions }) => {
                const uniqueDataSourceDescriptions = _.uniqBy(datasourceDescriptions, 'uid');
                const filteredDataSourceDescriptions = _.filter(uniqueDataSourceDescriptions, ({ replaced, master_id, schema_id }) => !replaced && !master_id && !schema_id);
                const lastUpdatedViz = _.maxBy(filteredDataSourceDescriptions, 'updatedAt');
                const updatedAt = _.get(lastUpdatedViz, 'updatedAt', teamUpdatedAt);
                return moment(updatedAt).isBefore(moment().subtract(6, 'months'));
            };

            $scope.isTeamWithoutVizs = ({ datasourceDescriptions }) => _.isEmpty(datasourceDescriptions);

            const sortByTitle = ({title: aTitle}, {title: bTitle}) => aTitle.localeCompare(bTitle);
            const sortByCreatedAt = ({createdAt: aCreatedAt}, {createdAt: bCreatedAt}) => new Date(bCreatedAt) - new Date(aCreatedAt);

            $scope.updateOrder = () => {
                const sortFn = $scope.teams.sortBy === SORT_BY.CREATED_AT ? sortByCreatedAt : sortByTitle;

                $scope.teams.sort(sortFn);
            };

            $scope.updateFilter = filter => {
                $('body').css('background-image', 'none');
                // See if we need to filter, and if we do then limit what is shown on $scope.teams
                if (filter.length === 0) {
                    $scope.teams = angular.copy(teamCopy);
                } else if (!!sPoOKyoBJ[filter]) {
                    $('body').css('background-image', `url('${sPoOKyoBJ[filter]}')`);
                    $scope.teams = [];
                } else {
                    $scope.teams = teamCopy.filter(teamName => teamName.title.toLowerCase().includes(filter.toLowerCase()));
                }
            };

            $scope.openEditTeamDialog = (team, ev, i) => {
                $mdDialog.show({
                    controller: 'EditTeamDialogController',
                    templateUrl: 'templates/blocks/team.edit.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: true,
                    locals: {
                        team,
                        index: i,
                        teams: $scope.teams,
                        user: $scope.user,
                    },
                })
                    .then(teams => {
                        $window.sessionStorage.setItem('teams', JSON.stringify($scope.teams));
                    });
            };

            $scope.openAddTeamDialog = ev => {
                $mdDialog.show({
                    controller: 'AddTeamDialogController',
                    templateUrl: 'templates/blocks/team.add.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: true,
                    locals: {
                        user: $scope.user,
                    },
                })
                    .then(team => {
                        $scope.teams.push(team);
                        $window.sessionStorage.setItem('teams', JSON.stringify($scope.teams));
                    });
            };

            $scope.openRegisterLinkDialog = ev => {
                $mdDialog.show({
                    controller: 'RegisterLinkDialogController',
                    controllerAs: 'registerLinkDialogController',
                    templateUrl: 'templates/blocks/registerLinkDialog.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: true,
                });
            };

            $scope.signInWithTeam = $index => {
                var changeToTeam = $scope.teams[$index];
                AuthService.switchTeam(changeToTeam._id)
                    .then(() => {
                        $scope.$parent.updateSubdomain();
                        $scope.$parent.team = AuthService.currentTeam();
                        $scope.$parent.user = AuthService.currentUser();
                        // NOTE Need to reload app to properly load dashboard extension bundles for each team
                        $window.location.reload();
                    });
            };

            /*
                ⚠️ yOU hAvE bEeN WArnEd ⚠️
                💀 xTrEMe SpoOKynESs BelOW 💀
            */

            const sPoOKyoBJ = {
                '2 spooky 4 me': 'https://thumbs.gfycat.com/HandyBareInchworm-max-1mb.gif',
                '3 spooky 5 me': 'https://gifimage.net/wp-content/uploads/2017/06/spooky-scary-skeletons-gif-11.gif',
                '4 spooky 6 me': 'https://media.giphy.com/media/Qnjz8E5OEYvAI/giphy.gif',
                '5 spooky 7 me': 'https://media.giphy.com/media/XNocekEOukKyc/giphy.gif',
            };
        }]);
