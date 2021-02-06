(function() {
    var signupModule = angular.module('signupModule');
    signupModule.directive('uniqueEmail', ['$q', 'User', function($q, User) {
        return {
            restrict: 'AE',
            require: 'ngModel',
            link: function(scope, elem, attr, model) {
                model.$asyncValidators.emailAvailable = function(modelValue, viewValue) {
                    var value = modelValue || viewValue;
                    var params = { email: value.toLowerCase() };
                    var deferred = $q.defer();
                    User.search(params)
                        .$promise.then(function() {
                            deferred.resolve(true);
                        }, function() {
                            deferred.reject(false);
                        });
                    return deferred.promise;
                };

            }
        };

    }]);

    signupModule.directive('accountExist', ['$q', 'User', function($q, User) {
        return {
            restrict: 'AE',
            require: 'ngModel',
            link: function(scope, elem, attr, model) {

                model.$asyncValidators.exist = function(modelValue, viewValue) {
                    var value = modelValue || viewValue;
                    var params = { email: value, provider: 'local', activated: true };
                    var deferred = $q.defer();
                    User.search(params)
                        .$promise.then(function() {
                            deferred.reject(false);
                        }, function() {
                            deferred.resolve(true);
                        });
                    return deferred.promise;
                };

            }
        };

    }]);


    signupModule.directive('passwordChecker', function() {
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

    });


    signupModule.directive('uniqueSubdomain', ['$q', 'Team', function($q, Team) {
        return {
            restrict: 'AE',
            require: 'ngModel',
            link: function(scope, elem, attr, model) {


                model.$asyncValidators.subdomainAvailable = function(modelValue, viewValue) {


                    var value = modelValue || viewValue;

                    var params = { subdomain: value };
                    var deferred = $q.defer();

                    if (value === 'app') {
                        deferred.reject(false);
                    } else {
                        if (scope.invitedUser) {
                            deferred.resolve(true);
                        } else {
                            Team.search(params)
                                .$promise.then(function(data) {

                                    if (data.length === 0) {
                                        deferred.resolve(true);
                                    } else {
                                        deferred.reject(false);
                                    }

                                }, function() {
                                    deferred.reject(false);
                                });

                        }
                    }
                    return deferred.promise;
                };

            }
        };

    }]);

    signupModule.directive('checkRequired', function() {
        return {
            require: 'ngModel',
            restrict: 'A',
            link: function (scope, element, attrs, ngModel) {
                ngModel.$validators.checkRequired = function (modelValue, viewValue) {
                    var value = modelValue || viewValue;
                    var match = scope.$eval(attrs.ngTrueValue) || true;
                    return value && match === value;
                };
            }
        };
    });

})();
