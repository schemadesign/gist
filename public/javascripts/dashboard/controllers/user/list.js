angular
    .module('arraysApp')
    .controller('BaseUserListCtrl', function ($scope, AuthService, User, $mdDialog, Team, $window, $location) {
        const { dashboardCtrl } = $scope;

        $scope.primaryAction.disabled = true;
        $scope.primaryAction.text = 'Invite User';

        var users = $scope.users;
        var datasets = $scope.datasets;
        var articles = $scope.articles || [];
        var sites = $scope.sites || [];

        users.$promise.then(function () {
            $scope.updateUserRolesOnTeam();
        });

        $scope.datasetUserRoles = {};
        $scope.articleUserRoles = {};
        $scope.siteUserRoles = {};

        /**
         * List helper functions
         */
        const isVisualizationEditorRole = person => person.role === 'visualizationEditor';
        
        $scope.filterUsers;
        let userCopy = angular.copy($scope.users);
        $scope.updateFilterUser = function(filter) {
            if (!filter.length) {
                $scope.users = angular.copy(userCopy);
            } else {
                $scope.users = userCopy.filter(function(userName) {
                    return userName.email.toLowerCase().includes(filter.toLowerCase());
                });
            }
        };

        $scope.userIsEditable = function (person, user) {
            var userIsNotPerson = user._id !== person._id;
            if (isVisualizationEditorRole(person)) {
                return false;
            }
            if (user.invited) {
                return userIsNotPerson && !user.invited[person._id];
            }
            return userIsNotPerson;
        };

        // Wrapper for edit/resend functions for when a user clicks on a user name
        $scope.textClickHandler = function ($event, person, user, $index) {
            if ($scope.userIsEditable(person, user)) {
                $scope.openUserDialog($event, person, $index);
            } else if (user.invited && user.invited[person._id]) {
                $scope.resendInvite($event, $index);
            } else if (isVisualizationEditorRole(person)) {
                $location.path('/dashboard/team/api').replace();
            }
        };

        $scope.updateRoles = function (user, data, editorList, viewerList, roleList) {
            // init editor and viewer lists if they don't exist
            if (user && !user[editorList]) {
                user[editorList] = [];
            }
            if (user && !user[viewerList]) {
                user[viewerList] = [];
            }

            data.forEach(function (item) {
                var id = item._id;

                if (user && user[editorList].includes(id)) {
                    $scope[roleList][id] = 'editor';
                } else if (user && user[viewerList].includes(id)) {
                    $scope[roleList][id] = 'viewer';
                } else {
                    $scope[roleList][id] = '';
                }
            });
        };

        $scope.updateUserRoles = function (user) {
            $scope.updateRoles(user, datasets, '_editors', '_viewers', 'datasetUserRoles');
            $scope.updateRoles(user, articles, '_articleEditors', '_articleViewers', 'articleUserRoles');
            $scope.updateRoles(user, sites, '_siteEditors', '_siteViewers', 'siteUserRoles');
        };

        $scope.assignRoles = function (user, editorList, viewerList, roleList) {
            for (var id in $scope[roleList]) {
                var role = $scope[roleList][id];
                if (role === 'editor') {
                    user[editorList].push(id);
                } else if (role === 'viewer') {
                    user[viewerList].push(id);
                }
            }
        };

        $scope.bindUserRolesToSelectedUser = function (user) {

            var TeamIdExist = function () {
                for (var i = 0; i < user._team.length; i++) {
                    if (typeof user._team[i] === 'string') {
                        if (user._team[i] === $scope.team._id) {
                            return true;
                        }
                    } else if (typeof user._team[i] === 'object') {
                        if (user._team[i]._id === $scope.team._id) {
                            return true;
                        }
                    }
                }
                return false;
            };

            if (TeamIdExist()) {
                user._editors = [];
                user._viewers = [];
                user._articleEditors = [];
                user._articleViewers = [];
                user._siteEditors = [];
                user._siteViewers = [];
            } else {
                user._team.push($scope.team._id);
            }
            $scope.assignRoles(user, '_editors', '_viewers', 'datasetUserRoles');
            $scope.assignRoles(user, '_articleEditors', '_articleViewers', 'articleUserRoles');
            $scope.assignRoles(user, '_siteEditors', '_siteViewers', 'siteUserRoles');

            $scope.updateUserRolesOnTeam();
        };

        $scope.updateUserRolesOnTeam = function () {
            // Update roles on invited users
            angular.forEach($scope.$parent.user.invited, function (invitedUser, key) {
                angular.forEach($scope.users, function (user) {
                    if (key === user._id) {
                        user._viewers = invitedUser._viewers;
                        user._editors = invitedUser._editors;
                        user._articleViewers = invitedUser._articleViewers;
                        user._articleEditors = invitedUser._articleEditors;
                        user._siteViewers = invitedUser._siteViewers;
                        user._siteEditors = invitedUser._siteEditors;
                    }
                });
            });
        };

        $scope.primaryAction.do = function (ev) {
            $scope.openUserDialog(ev);
        };

        $scope.remove = function (ev, index) {
            var person = $scope.users[index];

            function removeDialog($scope, $mdDialog, person, team) {
                $scope.person = person;
                $scope.team = team;
                $scope.hide = function () {
                    $mdDialog.hide();
                };
                $scope.cancel = function () {
                    $mdDialog.cancel();
                };
            }

            removeDialog.$inject = ['$scope', '$mdDialog', 'person', 'team'];

            $mdDialog.show({
                templateUrl: 'templates/blocks/user.delete.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose: true,
                fullscreen: true,
                locals: {
                    person: person,
                    team: $scope.team,
                },
                controller: removeDialog,
            })
                .then(function () {

                    person.$remove(function () {
                        $scope.users.splice($scope.users.indexOf(person), 1);

                        dashboardCtrl.showSimpleToast('User deleted.');
                    }, ({ data }) => {
                        dashboardCtrl.showSimpleToast(data.error);
                    });

                }, function () {
                    // $log.log('You decided to keep this user.');
                });

        };

        var inviteAndSentEmail = function (invitedUser) {
            AuthService.inviteUser(invitedUser)
                .then(function ({ data, status }) {
                    if (status === 200) {
                        const toastMessage = data.error || 'Invitation sent!';

                        dashboardCtrl.showSimpleToast(toastMessage);

                        if (data.invitedUser) {
                            $scope.users.push(new User(data.invitedUser));
                        } else {
                            $scope.users.push(new User(invitedUser));
                        }
                    }
                }, function (err) {
                    dashboardCtrl.showSimpleToast(err.data.error);
                });
        };

        var saveExistingUser = function (selectedUser) {
            selectedUser.$save(function (savedUser) {
                if (savedUser) {
                    dashboardCtrl.showSimpleToast('User Role saved successfully!');
                }
            }, function (err) {
                dashboardCtrl.showSimpleToast(err);
            });
        };

        $scope.openUserDialog = function (ev, selectedUser = {}, index) {
            $scope.updateUserRoles(selectedUser);

            $mdDialog.show({
                controller: 'UserDialogCtrl',
                controllerAs: 'userDialogCtrl',
                templateUrl: 'templates/blocks/user.edit.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                scope: $scope.$new(),
                clickOutsideToClose: true,
                fullscreen: true,
                locals: {
                    selectedUser,
                    userList: $scope.users,
                },
            }).then(function (object) {
                if (object && object.action === 'invite' && object.invitedUser) {
                    $scope.bindUserRolesToSelectedUser(object.invitedUser);
                    inviteAndSentEmail(object.invitedUser);
                }

                if (object && object.user && object.user.invited) {
                    $scope.$parent.user.invited = object.user.invited;
                    AuthService.updateUser($scope.$parent.user);
                }

                if (object && object.action === 'save' && object.selectedUser) {
                    const user = _.cloneDeep(object.selectedUser);

                    $scope.bindUserRolesToSelectedUser(object.selectedUser);
                    $scope.updateUserRoles(object.selectedUser);

                    const permissions = [
                        { type: '_editors', dataType: 'datasourceDescriptions' },
                        { type: '_viewers', dataType: 'datasourceDescriptions' },
                        { type: '_siteEditors', dataType: 'sites' },
                        { type: '_siteViewers', dataType: 'sites' },
                        { type: '_articleEditors', dataType: 'pages' },
                        { type: '_articleViewers', dataType: 'pages' },
                    ];

                    permissions.map(({ type, dataType }) => {
                        const filterFunc = (data) => !$scope.team[dataType].includes(data);

                        object.selectedUser[type].push(...user[type].filter(filterFunc));
                    });

                    saveExistingUser(object.selectedUser);
                }

                $scope.updateUserRolesOnTeam();

            }, function (data) {
                if (data && data.modalType === 'make-admin' && data.person) {
                    $scope.openAdminDialog(ev, data.person, 'make');
                } else if (data && data.modalType === 'revoke-admin' && data.person) {
                    $scope.openAdminDialog(ev, data.person, 'revoke');
                } else if (data && data.modalType === 'permission' && data.selectedUser) {
                    $scope.openPermissionDialog(ev, data.selectedUser);
                }
            });
        };

        var makeRoles = function (roleList, role) {
            for (var id in $scope[roleList]) {
                if ($scope[roleList].hasOwnProperty(id)) {
                    $scope[roleList][id] = role;
                }
            }
        };

        $scope.makeAllRoles = function (role, type) {
            if (type === 'viz') {
                makeRoles('datasetUserRoles', role);
            } else if (type === 'article') {
                makeRoles('articleUserRoles', role);
            } else if (type === 'site') {
                makeRoles('siteUserRoles', role);
            }
            this.userDialogCtrl.vm.userForm.$setDirty();
        };

        // TODO: This can most likely be removed
        $scope.openPermissionDialog = function (ev, selected) {

            $mdDialog.show({
                templateUrl: 'templates/blocks/user.permissions.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose: true,
                fullscreen: true,
                locals: {
                    email: selected.email,
                    team: $scope.team,
                },
                controller: function ($scope, $mdDialog, email, team) {
                    $scope.email = email;
                    $scope.team = team;

                    $scope.hide = function (data) {
                        $mdDialog.hide(data);
                    };
                    $scope.cancel = function () {
                        $mdDialog.cancel();
                    };
                },
            })
                .then(function () {
                    $scope.bindUserRolesToSelectedUser(selected);
                    $scope.updateUserRoles(selected);

                    if (!selected.defaultLoginTeam) {
                        selected.defaultLoginTeam = $scope.team._id;
                    }

                    AuthService.inviteUser(selected)
                        .then(function (response) {
                            if (response.status === 200) {
                                dashboardCtrl.showSimpleToast('User role saved!');
                                $scope.users.push(new User(selected));
                                $scope.updateUserRolesOnTeam();
                            }
                        }, function (err) {
                            dashboardCtrl.showSimpleToast(err);
                        });

                }, function () {
                    // $log.log('You decided not to give this user permission to your datasets');
                });
        };

        $scope.openAdminDialog = function (ev, person, action) {
            function adminDialog($scope, $mdDialog, person, team, action) {
                $scope.person = person;
                $scope.team = team;
                $scope.action = action;

                $scope.hide = function () {
                    $mdDialog.hide();
                };

                $scope.cancel = function () {
                    $mdDialog.cancel();
                };
            }

            $mdDialog.show({
                templateUrl: 'templates/blocks/user.admin.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose: true,
                fullscreen: true,
                locals: {
                    person,
                    team: $scope.team,
                    action,
                },
                controller: adminDialog,
            }).then(function () {
                if (action === 'make') {
                    Team.addAdmin({ _id: person._id })
                        .$promise
                        .then(() => {
                            $scope.team.admin.push(person._id);
                            $scope.users = User.getAll({ teamId: $scope.team._id });
                            dashboardCtrl.showSimpleToast('Admin role assigned!');
                        })
                        .catch(({ data }) => {
                            dashboardCtrl.showSimpleToast(data.error);
                        });
                } else if (action === 'revoke') {
                    Team.deleteAdmin({ _id: person._id })
                        .$promise
                        .then(() => {
                            $scope.team.admin = $scope.team.admin.filter(id => id !== person._id);
                            $scope.users = User.getAll({ teamId: $scope.$parent.team._id });
                            dashboardCtrl.showSimpleToast('Admin role revoked!');
                        })
                        .catch(({ data }) => {
                            dashboardCtrl.showSimpleToast(data.error);
                        });
                }
            }, function () {
                // $log.log('user decided not to transfer admin');
            });
        };

        $scope.resendInvite = function (ev, index) {
            var invitedUser = $scope.users[index];

            function resendInviteController($scope, $mdDialog, person) {
                $scope.person = person;

                $scope.hide = function () {
                    $mdDialog.hide();
                };

                $scope.cancel = function () {
                    $mdDialog.cancel();
                };
            }

            resendInviteController.$inject = ['$scope', '$mdDialog', 'person'];

            $mdDialog.show({
                templateUrl: 'templates/blocks/user.resend.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose: true,
                fullscreen: true,
                locals: {
                    person: invitedUser,
                },
                controller: resendInviteController,
            })
                .then(function () {
                    AuthService.resendInvite(invitedUser._id)
                        .then(function (response) {
                            if (response.status === 200) {
                                dashboardCtrl.showSimpleToast('Invitation resent!');
                            }
                        }, function (err) {
                            dashboardCtrl.showSimpleToast(err);
                        });
                });
        };

        /**
         * If the copy link button is pressed, then copy that sucker over!
         * @param {*} user
         */
        $scope.copyLink = user => {
            copyToClipboard(user.inviteLink);
        };

        /**
         * Copy to clipboard from hackernoon.com 🙆🏻‍♂️
         * @param {*} str
         */
        const copyToClipboard = str => {
            const el = document.createElement('textarea');
            el.value = str;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        };
    })
    .controller('UserListCtrl', function ($scope, $controller, users, datasets, articles, sites) {
        $scope.users = users;
        $scope.datasets = datasets;
        $scope.articles = articles;
        $scope.sites = sites.data;

        angular.extend(this, $controller('BaseUserListCtrl', {
            $scope: $scope,
        }));
    });
