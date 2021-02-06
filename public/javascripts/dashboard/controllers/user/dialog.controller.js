function UserDialogCtrl($scope, $mdDialog, $window, $mdToast, selectedUser, User, userList) {
    const userDialogCtrl = this;

    userDialogCtrl.selectedUser = selectedUser;
    userDialogCtrl.canCreateNewViz = _.includes(userDialogCtrl.selectedUser.canCreateNewViz, $scope.team._id);
    userDialogCtrl.canCreateNewSite = _.includes(userDialogCtrl.selectedUser.canCreateNewSite, $scope.team._id);
    userDialogCtrl.canCreateNewArticle = _.includes(userDialogCtrl.selectedUser.canCreateNewArticle, $scope.team._id);
    userDialogCtrl.availableUserRoles = [
        { name: 'Editor', value: 'editor' },
        { name: 'Viewer', value: 'viewer' },
        { name: 'None', value: '' },
    ];
    userDialogCtrl.hide = hide;
    userDialogCtrl.cancel = cancel;
    userDialogCtrl.saveUser = saveUser;
    userDialogCtrl.inviteUser = inviteUser;
    userDialogCtrl.makeTeamAdmin = makeTeamAdmin;
    userDialogCtrl.revokeTeamAdmin = revokeTeamAdmin;
    userDialogCtrl.toggleCanCreate = toggleCanCreate;

    $scope.$watch('userDialogCtrl.selectedUser.email', (data) => {
        if (userDialogCtrl.vm.userForm.email && data) {
            userDialogCtrl.selectedUser.email = _.toLower(data);
            userDialogCtrl.vm.userForm.email.$setValidity('unique', !emailInTeam());
        }
    });

    function toggleCanCreate(type) {
        if (!userDialogCtrl.selectedUser[type]) {
            userDialogCtrl.selectedUser[type] = [];
        }

        if (userDialogCtrl[type]) {
            userDialogCtrl.selectedUser[type].push($scope.team._id);
        } else {
            _.pull(userDialogCtrl.selectedUser[type], $scope.team._id);
        }
    }

    function hide(data) {
        $mdDialog.hide(data);
    }

    function cancel(data) {
        $mdDialog.cancel(data);
    }

    function saveUser() {
        userDialogCtrl.hide({ action: 'save', selectedUser: userDialogCtrl.selectedUser });
    }

    function inviteUser() {
        selectedUser.email = selectedUser.email.toLowerCase();

        const userEmail = selectedUser.email;
        const queryParams = { email: userEmail.toLowerCase() };

        User.search(queryParams).$promise.then(function (data) {
            if (data.length) {
                if (data[0]._team.indexOf($scope.team._id) >= 0) {
                    userDialogCtrl.vm.userForm['email'].$setValidity('unique', false);
                } else {
                    const userData = _.cloneDeep(data[0]);
                    _.forEach(selectedUser, (value, key) => {
                        if (value.length && _.isArray(value)) {
                            if (!userData[key]) {
                                userData[key] = [];
                            }

                            userData[key] = userData[key].concat(value);
                        }
                    });

                    userDialogCtrl.hide({ action: 'invite', invitedUser: userData });
                }
            } else {
                selectedUser._team = [$scope.team._id];
                selectedUser.defaultLoginTeam = $scope.team._id;

                userDialogCtrl.hide({ action: 'invite', invitedUser: selectedUser });
            }
        });
    }

    function makeTeamAdmin(ev, person) {
        userDialogCtrl.cancel({ person: person, modalType: 'make-admin' });
    }

    function revokeTeamAdmin(ev, person) {
        userDialogCtrl.cancel({ person: person, modalType: 'revoke-admin' });
    }

    function emailInTeam() {
        return userList.some(user => user.email === selectedUser.email);
    }
}

angular.module('arraysApp')
    .controller('UserDialogCtrl', UserDialogCtrl);
