function uniqueTitle(DatasetService, AuthService, $q) {
    return {
        restrict: 'A',
        require: 'ngModel',
        scope: {
            datasetId: '=',
            submittingFlag: '=?',
            replacement: '=',
        },
        link: function (scope, elem, attr, model) {
            model.$asyncValidators.titleAvailable = function (modelValue, viewValue) {
                let value = _.kebabCase(modelValue || viewValue);
                value = scope.replacement ? `${value}-draft` : value;
                const team = AuthService.currentTeam();
                const deferred = $q.defer();

                if (value === 'api') { //reserve api path
                    return $q.reject(false);
                }

                scope.submittingFlag = true;

                DatasetService.getDatasetsWithQuery({ uid: value, _team: team._id })
                    .then(function (response) {
                        scope.submittingFlag = false;

                        if (response.length > 0) {
                            // allow a dataset or its revisions to have the same title
                            if (response.filter(function (dataset) {
                                return dataset._id === scope.datasetId;
                            }).length === 1) {
                                deferred.resolve(true);
                            } else {
                                deferred.reject(false);
                            }
                        } else {
                            deferred.resolve(true);
                        }
                    });

                return deferred.promise;
            };
        },
    };
}

angular.module('arraysApp')
    .directive('uniqueTitle', uniqueTitle);
