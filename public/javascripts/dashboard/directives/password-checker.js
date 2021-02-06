angular.module('arraysApp')
    .directive('passwordChecker', [function() {
        return {
            restrict: 'A',
            require: 'ngModel',
            scope: {
                matchTarget: '='

            },
            link: function(scope, elem, attr, model) {
                var validator = function(value) {
                    model.$setValidity('match', value === scope.matchTarget);
                    return value;
                };
                model.$parsers.unshift(validator);
                model.$formatters.push(validator);

                scope.$watch('matchTarget', function() {
                    validator(model.$viewValue);
                });
            }
        };
    }])

    .directive('noDirtyCheck', function() {
        // Interacting with input elements having this directive won't cause the
        // form to be marked dirty.
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, elm, attrs, ctrl) {
                ctrl.$pristine = false;
            }
        };
    })


    .directive('validatePassword', ['$q', 'User', function($q, User) {
        return {
            restrict: 'A',
            require: 'ngModel',

            link: function(scope, elem, attr, model) {


                model.$asyncValidators.correct = function(modelValue, viewValue) {
                    var value = modelValue || viewValue;
                    var params = { password: value };

                    var deferred = $q.defer();
                    User.checkPw({ id: scope.user._id }, params)
                        .$promise.then(function(res) {
                            if (res.valid == false) {
                                deferred.reject(false);
                            } else {
                                deferred.resolve(true);
                            }
                        });
                    return deferred.promise;
                };

            }
        };
    }]);
