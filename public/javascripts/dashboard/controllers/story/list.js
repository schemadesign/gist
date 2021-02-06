angular.module('arraysApp')
    .controller('StoryListCtrl', ['$scope', 'stories', '$state', 'Story', '$mdToast', '$mdDialog', 'AclService',
        function ($scope, stories, $state, Story, $mdToast, $mdDialog, AclService) {

            $scope.stories = stories;
            $scope.teams = {};
            $scope.users = {};
            $scope.filter = {};
            $scope.teams['*'] = 'All Teams';
            $scope.filter.team = '*';

            if (AclService.can('user', 'seeInsights')) {
                $scope.users['*'] = 'All Users';
                $scope.filter.user = '*';
            } else {
                $scope.filter.user = $scope.user._id;
            }

            angular.forEach($scope.stories, function(stry) {
                var teamId = stry.datasourceDescription._team._id;
                var userId = stry.createdBy._id;

                if (!$scope.teams[teamId]) {
                    $scope.teams[teamId] = stry.datasourceDescription._team.title;


                }
                if (!$scope.users[userId]) {
                    $scope.users[userId] = stry.createdBy.firstName + ' ' + stry.createdBy.lastName;
                }
            });

            $scope.storyFilter = function(item) {
                var author = item.createdBy._id;
                var team = item.datasourceDescription._team._id;
                if ($scope.filter.team && $scope.filter.team !== '*' && team !== $scope.filter.team) {
                    return false;
                }
                if ($scope.filter.user && $scope.filter.user !== '*' && author !== $scope.filter.user) {
                    return false;
                }
                return true;
            };

            $scope.select = function (id) {
                $state.go('dashboard.stories.edit', { id: id });
            };

            $scope.remove = function(id, title) {

                $mdDialog.show({
                    templateUrl: 'templates/blocks/story.delete.html',
                    parent: angular.element(document.body),
                    clickOutsideToClose: true,
                    fullscreen: true,
                    locals: {
                        title: title
                    },
                    controller: function($scope, $mdDialog) {
                        $scope.title = title;
                        $scope.hide = function() {
                            $mdDialog.hide();
                        };
                        $scope.cancel = function() {
                            $mdDialog.cancel();
                        };
                    }
                })
                    .then(function () {
                        Story.delete({ id: id }).$promise
                            .then(function(response) {

                                if (response.error) {

                                    $mdToast.show(
                                        $mdToast.simple()
                                            .textContent('Error deleting insight: ' + response.error)
                                            .position('top right')
                                            .hideDelay(3000)
                                    );

                                } else {

                                    $mdToast.show(
                                        $mdToast.simple()
                                            .textContent('Insight deleted!')
                                            .position('top right')
                                            .hideDelay(3000)
                                    );
                                    for (var i = 0; i < $scope.stories.length; i++) {
                                        if ($scope.stories[i]._id == id) {
                                            $scope.stories.splice(i, 1);
                                            break;
                                        }
                                    }


                                }
                            });
                    }, function () {
                    // console.log('You decided to keep your dataset.');
                    });

            };

        }]);
