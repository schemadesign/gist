angular.module('arraysApp')
    .directive('uniqueEmail', ['$q', 'User', function ($q, User) {
        return {
            require: 'ngModel',
            link: function (scope, elem, attr, model) {
                model.$asyncValidators.unique = function (modelValue, viewValue) {
                    const value = modelValue || viewValue;
                    const queryParams = { email: value };
                    const deferred = $q.defer();

                    User.search(queryParams).$promise.then(function (data) {
                        if (data.length === 0) {
                            deferred.resolve(true);
                        } else {
                            if (data[0].activated) {
                                deferred.reject(false);
                            } else {
                                deferred.resolve(true);
                            }
                        }
                    }, function () {
                        deferred.reject(false);
                    });
                    return deferred.promise;
                };
            }
        };
    }]);
