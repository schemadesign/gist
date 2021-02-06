(function () {
    const signupModule = angular.module('signupModule');

    signupModule.controller('mainCtrl', [
        '$scope',
        'User',
        '$state',
        'env',
        '$location',
        '$window',
        'Token',
        async function ($scope, User, $state, env, $location, $window, Token) {
            $scope.env = env;
            const { superUser, token } = $location.search();
            $scope.loading = !superUser;

            if (!superUser) {
                if (token) {
                    try {
                        await Token.validate({ token }).$promise;
                        $scope.$apply(() => {
                            $scope.loading = false;
                        });
                    } catch ({ data }) {
                        $state.go('signup.error', { errorType: data.errorType, tokenFlow: true });
                    }
                } else {
                    $state.go('signup.error', { errorType: 'missing', tokenFlow: true });
                }
            }

            $scope.createUser = async () => {
                const schemaEmailRegexp = new RegExp('\\+superuser@schemadesign.com$');

                if (!token && !schemaEmailRegexp.test($scope.user.email)) {
                    $state.go('signup.error', {
                        errorType: 'missing',
                        tokenFlow: true,
                    });
                    return;
                }
                try {
                    const user = await User.save({ ...$scope.user, tokenId: token }).$promise;

                    if (superUser) {
                        $state.go('signup.success', { isInvite: false, id: user._id, resent: false });
                    } else {
                        $window.location.href = '/auth/login';
                    }
                } catch ({ data }) {
                    $state.go('signup.error', { errorType: data.errorType, tokenFlow: true });
                }
            };

            const resendActivation = user => {
                User.resendActivation({ id: user._id }).$promise.then(
                    () => {
                        $state.go('signup.success', { isInvite: false, id: user._id, resent: true });
                    },
                    () => {
                        $state.go('signup.error', { email: true });
                    },
                );
            };

            const resendInvite = user => {
                // todo: fix this admin[0]
                User.resendInvite({ id: user.defaultLoginTeam.admin[0], invitee: user._id }).$promise.then(
                    () => {
                        $state.go('signup.success', {
                            isInvite: true,
                            id: user._id,
                            resent: true,
                            invitedBy: user.defaultLoginTeam.admin[0],
                        });
                    },
                    () => {
                        $state.go('signup.error', { email: true });
                    },
                );
            };

            $scope.resendActivationEmail = function (user) {
                if (user.defaultLoginTeam.admin.includes(user._id)) {
                    resendActivation(user);
                } else {
                    resendInvite(user);
                }
            };
        },
    ]);

    signupModule.controller('signupCtrl', [
        '$scope',
        '$transition$',
        'User',
        '$state',
        '$location',
        'env',
        'user',
        function ($scope, $transition$, User, $state, $location, env, user) {
            $scope.env = env;
            $scope.user = user;

            var isCreatingNewTeam = function () {
                // if there are no teams attached to the user object, it's a new user creating a new team, not an invited
                // user
                return !$scope.user._team || $scope.user._team.length === 0;
            };

            $scope.invitedUser = !isCreatingNewTeam();

            if ($scope.invitedUser) {
                $scope.user._team = $scope.user._team[0];
            } else {
                $scope.user._team = {
                    title:
                        $scope.user.firstName && $scope.user.lastName ?
                            $scope.user.firstName + ' ' + $scope.user.lastName :
                            '',
                    subdomain:
                        $scope.user.firstName && $scope.user.lastName ?
                            ($scope.user.firstName + $scope.user.lastName).toLowerCase() :
                            '',
                };

                if ($scope.env.node_env === 'enterprise' && $scope.env.subdomain) {
                    $scope.user._team = {
                        subdomain: $scope.env.subdomain,
                    };
                    $scope.hideTeam = true;
                }
            }

            const resendActivation = user => {
                User.resendActivation({ id: user._id }).$promise.then(
                    () => {
                        $state.go('signup.success', { isInvite: false, id: user._id, resent: true });
                    },
                    () => {
                        $state.go('signup.error', { email: true });
                    },
                );
            };

            const resendInvite = user => {
                User.resendInvite({ id: user.defaultLoginTeam.admin[0], invitee: user._id }).$promise.then(
                    () => {
                        $state.go('signup.success', {
                            isInvite: true,
                            id: user._id,
                            resent: true,
                            invitedBy: user.defaultLoginTeam.admin[0],
                        });
                    },
                    () => {
                        $state.go('signup.error', { email: true });
                    },
                );
            };

            $scope.resendActivationEmail = function (user) {
                if (user.defaultLoginTeam.admin.includes(user._id)) {
                    resendActivation(user);
                } else {
                    resendInvite(user);
                }
            };

            $scope.registerUser = function () {
                User.update({ id: $scope.user._id }, $scope.user).$promise.then(function (data) {
                    if ($scope.invitedUser) {
                        $state.go('signup.success', { isInvite: true, id: null, resent: false });
                    } else {
                        if ($scope.user.activated) {
                            $state.go('signup.success', { isInvite: true, id: null, resent: false });
                        } else {
                            $state.go('signup.success', { isInvite: false, id: data._id, resent: false });
                        }
                    }
                });
            };
        },
    ]);

    signupModule.controller('successCtrl', [
        '$scope',
        '$transition$',
        '$window',
        function ($scope, $transition$, $window) {
            $scope.isInvite = $transition$.params().isInvite;
            $scope.resent = $transition$.params().resent;
            $scope.invitedBy = $transition$.params().invitedBy;

            var userId = $transition$.params().id;

            if (!$scope.isInvite) {
                $scope.resendActivationLink = '/api/user/' + userId + '/resend?emailType=activation';
            } else {
                $scope.resendActivationLink = '/api/user/' + $scope.invitedBy + '/resend/?Invitee=' + userId;
            }
            $scope.login = function () {
                $window.location.href = '/auth/login';
            };
        },
    ]);

    signupModule.controller('SignupErrorCtrl', [
        '$scope',
        '$transition$',
        '$window',
        function ($scope, $transition$, $window) {
            $scope.error = $transition$.params().name;
            $scope.message = $transition$.params().msg;
            $scope.userId = $transition$.params().id;
            $scope.tokenFlow = $transition$.params().tokenFlow;
            $scope.errorType = $transition$.params().errorType;

            if ($scope.userId) {
                $scope.resendActivationLink = '/api/user/' + $scope.userId + '/resend?emailType=activation';
            }
            $scope.login = function () {
                $window.location.href = '/auth/login';
            };
        },
    ]);

    signupModule.controller('passwordCtrl', [
        '$scope',
        'User',
        '$transition$',
        '$window',
        '$state',
        function ($scope, User, $transition$, $window, $state) {
            $scope.userId = $transition$.params().userId;
            $scope.msg = $transition$.params().msg;
            $scope.err = $transition$.params().err;

            $scope.sendResetEmail = function () {
                User.resetPassword({ email: $scope.user.email }).$promise.then(
                    function (response) {
                        if (response.data === 'ok') {
                            $state.go('reset.success', {
                                successMsg:
                                    'Password reset email sent! Please check your email and follow the instructions to reset your account password.',
                            });
                        }
                    },
                    function (response) {
                        $scope.err = response.data.err;
                    },
                );
            };

            $scope.updatePassword = function (pw) {
                var param = {
                    password: pw,
                };
                User.updateProfile({ id: $scope.userId }, param).$promise.then(function (response) {
                    if (response._id) {
                        $scope.success = true;
                    }
                });
            };

            $scope.login = function () {
                $window.location.href = '/auth/login';
            };
        },
    ]);
})();
