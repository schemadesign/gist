(function () {
    angular.module('signupModule', ['ui.router', 'ngMessages', 'ngResource', 'ngMaterial'])
        .config(function ($stateProvider, $urlServiceProvider, $locationProvider) {

            $urlServiceProvider.rules.when('/reset', '/reset/email');
            $urlServiceProvider.rules.when('/signup', '/signup/email');

            $stateProvider
                .state('signup', {
                    abstract: true,
                    url: '/signup',
                    templateUrl: 'templates/signup.html',
                })

                .state('reset', {
                    abstract: true,
                    url: '/reset',
                    templateUrl: 'templates/signup.html',
                });

            $stateProvider
                .state('reset.email', {
                    url: '/email',
                    templateUrl: 'templates/blocks/reset.email.html',
                    controller: 'passwordCtrl',
                })
                .state('reset.password', {
                    url: '/password?userId&err&msg',
                    templateUrl: 'templates/blocks/reset.password.html',
                    controller: 'passwordCtrl',
                })
                .state('reset.success', {
                    url: '/success',
                    params: {
                        successMsg: null,
                    },
                    controller: function ($scope, $transition$) {
                        $scope.successMsg = $transition$.params().successMsg;
                    },
                    template: '<h2>{{successMsg}}</h2>',
                })
                .state('signup.email', {
                    url: '/email',
                    templateUrl: 'templates/blocks/signup.email.html',
                    controller: 'mainCtrl',
                    resolve: {
                        env: ENV => ENV.get(),
                    },
                    resolvePolicy: {
                        env: { when: 'EAGER' },
                    },
                })
                .state('signup.info', {
                    url: '/info/:id',
                    templateUrl: 'templates/blocks/signup.info.html',
                    controller: 'signupCtrl',
                    resolve: {
                        env: function (ENV) {
                            return ENV.get();
                        },
                        user: ['User', '$transition$', '$state', function (User, $transition$, $state) {
                            var userId = $transition$.params().id;

                            var isSigningUpTwice = function (user) {
                                // if the user has already signed up, and therefore is the team admin, they're not
                                // invited just struggling to sign up (replicate by going back to the signup page after
                                // signing up without clicking the email verification link)
                                if (user.defaultLoginTeam && user.defaultLoginTeam.admin.includes(user._id)) {
                                    return true;
                                }
                                return false;
                            };

                            return User.getEmail({ id: userId }, function (user) {
                                if (isSigningUpTwice(user)) {
                                    $state.go('signup.error', { id: userId });
                                } else {
                                    return user;
                                }
                            }, () => $state.go('signup.error', { id: userId })).$promise;

                        }],
                    },
                    resolvePolicy: {
                        env: { when: 'EAGER' },
                        user: { when: 'EAGER' },
                    },
                })
                .state('signup.success', {
                    url: '/success/:id',
                    params: {
                        isInvite: null,
                        resent: null,
                        invitedBy: null,
                    },
                    templateUrl: 'templates/blocks/signup.success.html',
                    controller: 'successCtrl',
                })
                .state('signup.error', {
                    url: '/error',
                    params: {
                        id: null,
                        name: null,
                        msg: null,
                        tokenFlow: false,
                        errorType: '',
                    },
                    templateUrl: 'templates/blocks/signup.error.html',
                    controller: 'SignupErrorCtrl',
                });

            $locationProvider.html5Mode(true);
        });
})();
