(() => {
    angular
        .module('arraysApp')
        .service('AuthService', AuthService);

    AuthService.$inject = ['$window', '$q', '$http', 'Team', 'Website', 'Page', 'AclService'];

    function AuthService($window, $q, $http, Team, Website, Page, AclService) {

        let isLoggedIn = false;

        let envPromise;

        const currentUser = () => {
            if (!isLoggedIn) {
                reload(res => {
                    if (res.success) {
                        return JSON.parse($window.sessionStorage.user);
                    }
                });
            } else if (isLoggedIn && $window.sessionStorage.user) {
                return JSON.parse($window.sessionStorage.user);
            } else {
                return null;
            }
        };

        const updateUser = (user) => {
            $window.sessionStorage.setItem('user', JSON.stringify(user));
        };

        const currentTeam = () => {
            if ($window.sessionStorage.team) {
                return JSON.parse($window.sessionStorage.team);
            } else {
                return null;
            }
        };

        const getToken = () => {
            const user = currentUser();
            if (user) {
                return user.authToken;
            }
            return null;
        };

        const getEnv = () => {
            if (envPromise) {
                return envPromise;
            }
            const deferred = $q.defer();
            $http.get('/env')
                .then(result => {
                    if (result.data) {
                        deferred.resolve(result.data);
                    } else {
                        deferred.reject();
                    }
                });
            envPromise = deferred.promise;
            return deferred.promise;
        };

        function reload(cb) {
            const deferred = $q.defer();
            $http.get('/api/user/currentUser')
                .then(result => {
                    const userData = result.data;
                    if (userData) {
                        isLoggedIn = true;
                        const promises = [AclService.getAllFor('user', userData._id, userData.role), AclService.getAllFor('team', userData.defaultLoginTeam._id)];

                        $q.all(promises).then(data => {
                            AclService.setAllInStorage('userPermissions', data[0]);
                            AclService.setAllInStorage('teamPermissions', data[1]);
                            updateUser(userData);
                            $window.sessionStorage.setItem('team', JSON.stringify(userData.defaultLoginTeam));

                            if (userData.role === 'superAdmin') {

                                Team.query()
                                    .$promise
                                    .then(allTeams => {
                                        $window.sessionStorage.setItem('teams', JSON.stringify(allTeams));
                                        cb({ success: true });
                                    });
                            } else {
                                $window.sessionStorage.setItem('teams', JSON.stringify(userData._team));
                                cb({ success: true });
                            }
                        });

                    } else {
                        cb({ success: false });
                        $window.location.href = '/auth/login';
                    }
                }, () => {
                    cb({ success: false });

                    deferred.reject();
                });
        }

        const ensureLogin = () => {
            const deferred = $q.defer();
            if (isLoggedIn && currentUser() !== null) {
                deferred.resolve();
            } else {
                reload(data => {
                    if (data.success) {
                        deferred.resolve();

                    } else {
                        deferred.reject();
                        $window.location.href = '/auth/login';

                    }
                });
            }

            return deferred.promise;
        };

        var allTeams = () => {
            let teams = null;
            try {
                teams = JSON.parse($window.sessionStorage.teams);
            } catch (e) {
                console.log(e);
            }
            return teams;
        };

        const switchTeam = teamId => {
            const deferred = $q.defer();
            Team.search({ _id: teamId })
                .$promise
                .then(teams => {
                    $window.sessionStorage.setItem('team', JSON.stringify(teams[0]));
                    $http.put('/api/user/defaultLoginTeam/' + teamId)
                        .then(() => {
                            const cu = currentUser();
                            cu.defaultLoginTeam = teams[0];
                            if (cu.role !== 'superAdmin') {
                                if (cu.defaultLoginTeam.admin.includes(cu._id)) {
                                    cu.role = 'admin';
                                } else {
                                    if (cu.role === 'admin' || cu.role === 'viewer') {
                                        let i = 0;
                                        for (i; i < cu._editors.length; i++) {
                                            if (cu.defaultLoginTeam.datasourceDescriptions.indexOf(cu._editors[i]) >= 0) {
                                                cu.role = 'editor';
                                                break;
                                            }
                                        }
                                    }
                                    if (cu.role === 'admin' || cu.role === 'editor') {
                                        let i = 0;
                                        for (i; i < cu._editors.length; i++) {

                                            if (cu.defaultLoginTeam.datasourceDescriptions.indexOf(cu._editors[i]) >= 0) {
                                                break;
                                            }
                                        }
                                        if (i >= cu._editors.length) {
                                            cu.role = 'viewer';
                                        }
                                    }
                                }
                            }
                            const promises = [AclService.getAllFor('user', cu._id, cu.role), AclService.getAllFor('team', cu.defaultLoginTeam._id)];
                            $q.all(promises).then(data => {
                                AclService.setAllInStorage('userPermissions', data[0]);
                                AclService.setAllInStorage('teamPermissions', data[1]);
                                updateUser(cu);
                                deferred.resolve();
                            });
                        }, response => {
                            deferred.reject(response);
                        });
                }, response => {
                    deferred.reject(response);
                });
            return deferred.promise;

        };

        const updateTeam = team => {

            const deferred = $q.defer();
            const currentTeamId = currentTeam()._id;

            Team.update({ id: currentTeamId }, team)
                .$promise
                .then(data => {
                    $window.sessionStorage.setItem('team', JSON.stringify(data.team));
                    const teams = allTeams();
                    for (let i = 0; i < teams.length; i++) {
                        if (teams[i]._id === data.team._id) {
                            teams[i] = data.team;
                            break;
                        }
                    }
                    $window.sessionStorage.setItem('teams', JSON.stringify(teams));

                    deferred.resolve(data.team);
                }, () => {
                    deferred.reject();
                });
            return deferred.promise;
        };

        const logout = returnTo => {
            $http.get('/auth/logout', returnTo && { params: { returnTo } })
                .then(response => {
                    if (response.status === 200) {
                        getEnv().then(env => {
                            isLoggedIn = false;
                            $window.sessionStorage.removeItem('userPermissions');
                            $window.sessionStorage.removeItem('teamPermissions');
                            $window.sessionStorage.removeItem('datasetPermissions');
                            $window.sessionStorage.removeItem('user');
                            $window.sessionStorage.removeItem('team');
                            $window.sessionStorage.removeItem('teams');
                            $window.location.href = env.authProtocol === 'OKTA' ? '/' : '/auth/login';
                        });
                    }
                });
        };

        const inviteUser = newUser => $http.post('/api/admin/invite', newUser);

        const resendInvite = id => {
            const currentUserId = currentUser()._id;
            return $http.get('/api/user/' + currentUserId + '/resend?Invitee=' + id);
        };

        return {
            currentUser,
            currentTeam,
            isLoggedIn,
            ensureLogIn: ensureLogin,
            allTeams,
            getEnv,
            resendInvite,
            reload,
            updateTeam,
            inviteUser,
            switchTeam,
            logout,
            getToken,
            updateUser,
        };
    }

})();
