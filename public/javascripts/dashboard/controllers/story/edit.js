angular.module('arraysApp')
    .controller('StoryEditCtrl', ['$scope', 'story', '$state', '$mdToast', function ($scope, story, $state, $mdToast) {

        $scope.story = story;

        $scope.storyMetadata = $scope.story.createdBy.firstName + ' ' + $scope.story.createdBy.lastName + ', ' +
            $scope.story.datasourceDescription.title + ', ' + $scope.story.datasourceDescription._team.title;
        $scope.storyTitle = $scope.story.title;

        $scope.teamSubdomain = `//${_.get($scope, 'story.datasourceDescription._team.subdomain', 'www')}.${$scope.env.host}`;

        // Keep the sharedPage id as a string here so it can be built in the ng-href directive
        $scope.storySharedPage = $scope.story.sharedPages[0]._id;

        // Get the shared pages image url
        $scope.makeBannerUrl = $scope.story.sharedPages[0].imageUrl;

        $scope.cancel = function () {
            $state.go('dashboard.stories.list');
        };

        $scope.update = function () {
            $scope.story.$save()
                .then(function (response) {

                    $scope.storyForm.$setPristine();

                    if (response.error) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Error updating story: ' + response.error)
                                .position('top right')
                                .hideDelay(3000)
                        );

                    } else {

                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Story saved!')
                                .position('top right')
                                .hideDelay(3000)
                        );
                    }

                    $state.go('dashboard.stories.list');

                });
        };

    }]);
