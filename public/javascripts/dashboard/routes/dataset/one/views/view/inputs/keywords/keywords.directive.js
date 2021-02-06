function gistViewInputKeywords($mdDialog, $document) {
    return {
        restrict: 'E',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/inputs/keywords/keywords.template.html',
        controller($scope) {
            const { datasetOneCtrl, viewCtrl } = $scope;

            $scope.getKeywords = getKeywords;

            function getKeywords(evt) {
                $mdDialog
                    .show({
                        multiple: true,
                        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/edit-keywords/edit-keywords.template.html',
                        parent: angular.element($document[0].body),
                        targetEvent: evt,
                        clickOutsideToClose: true,
                        fullscreen: true,
                        scope: $scope.$new(),
                        locals: {
                            datasetId: datasetOneCtrl.dataset._id,
                            field: viewCtrl.data.defaultGroupByColumnName,
                            currentKeywords: viewCtrl.data.keywords,
                        },
                        controller: 'EditKeywordsController',
                        controllerAs: 'editKeywordsController',
                    })
                    .then((savedKeywords) => {
                        if (savedKeywords) {
                            viewCtrl.data.keywords = savedKeywords;
                        }
                    })
                    .catch(_.noop);
            }
        },
    };
}

angular.module('arraysApp')
    .directive('gistViewInputKeywords', gistViewInputKeywords);
