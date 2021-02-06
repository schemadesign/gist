angular
    .module('arraysApp')
    .controller('DashboardCtrl', function ($scope, $rootScope, $state, AuthService, $window, $location, $mdSidenav, env,
                                           AclService, $mdToast, Permissions) {
        const dashboardCtrl = this;

        Permissions.canEnter($state.current.name);
        dashboardCtrl.showSimpleToast = showSimpleToast;
        dashboardCtrl.showGenericErrorToast = () => showSimpleToast('An error occurred.');
        dashboardCtrl.showTab = Permissions.canShow;
        dashboardCtrl.isAdminRole = Permissions.isAdminRole;

        $scope.env = env;
        $scope.user = AuthService.currentUser();
        $scope.team = AuthService.currentTeam();
        $scope.isVisualizationEditor = $scope.user.role === 'visualizationEditor';
        $scope.isAdmin = $scope.user.role === 'admin';

        dashboardCtrl.can = (module, permission) => AclService.can(module, permission);

        function updateCurrentMenuItem() {
            $scope.currentMenuItem = $scope.$state.current.name.split('.')[1];
        }

        if (!$state.current.name.includes('dashboard.dataset') && $scope.isVisualizationEditor) {
            $state.go('dashboard.dataset.list');
        }

        updateCurrentMenuItem();

        /**
         * @deprecated State Change Events were deprecated in UI-Router 1.0 but are supported via polyfill
         * See https://ui-router.github.io/guide/ng1/migrate-to-1_0#state-change-events
         */
        $scope.$on('$stateChangeStart',
            function (event, { name }) {
                Permissions.canEnter(name);

                if ($scope.isVisualizationEditor) {
                    if (!name.includes('dashboard.dataset')) {
                        $state.go('dashboard.dataset.list');
                    }
                    return;
                }

                $scope.closeLeft();
            });

        /**
         * @deprecated State Change Events were deprecated in UI-Router 1.0 but are supported via polyfill
         * See https://ui-router.github.io/guide/ng1/migrate-to-1_0#state-change-events
         */
        $scope.$on('$stateChangeSuccess', function () {
            updateCurrentMenuItem();

            // update user data on state change
            if (!$scope.user.isSuperAdmin) {
                AuthService.reload(function (res) {
                    if (res.success) {
                        $scope.user = JSON.parse($window.sessionStorage.user);
                    }
                });
            }
        });

        $scope.sidebarNavigate = function (state) {
            $scope.updateSubdomain();
            $state.go(state);
        };

        /**
         * If remindUserUnsavedChanges, show browser dialog to remind user to save changes.
         * These event listeners only check for navigation outside of the dashboard or page refresh.
         */
        const beforeUnloadMessage = (event) => {
            const dialogText = 'You have unsaved changes. Are you sure you want to leave this page?';
            event.returnValue = dialogText;
            return dialogText;
        };

        const onUnload = () => _.invoke($rootScope, 'onAfterDiscardChanges');

        $scope.setRemindUserUnsavedChanges = function (bool) {
            $rootScope._remindUserUnsavedChanges = bool;

            if (bool) {
                window.addEventListener('beforeunload', beforeUnloadMessage);
                window.addEventListener('unload', onUnload);
            } else {
                window.removeEventListener('beforeunload', beforeUnloadMessage);
                window.removeEventListener('unload', onUnload);
            }
        };

        $scope.teams = AuthService.allTeams();

        $scope.explore_url = $location.protocol() + '://';

        if ($scope.env.node_env !== 'enterprise') {
            $scope.explore_url += 'app.';
        }

        $scope.explore_url += env.host;

        $scope.updateSubdomain = function () {
            $scope.team = AuthService.currentTeam();

            if ($scope.env.node_env === 'enterprise' && $scope.env.hasSubteams) {
                var subTeamHost = env.host.replace($scope.env.subdomain, $scope.team.subdomain);
                $scope.subdomain = $location.protocol() + '://' + subTeamHost;
            } else if ($scope.env.node_env === 'enterprise') {
                $scope.subdomain = $scope.explore_url;
            } else {
                $scope.subdomain = $location.protocol() + '://' + $scope.team.subdomain + '.' + env.host;
            }

        };

        $scope.updateSubdomain();

        $scope.logout = function () {
            AuthService.logout();
        };


        $scope.goToList = () => {
            $state.go('dashboard.dataset.list');
        };

        /**
         * Sidebar
         */
        $scope.closeLeft = buildCloser('left');
        $scope.toggleLeft = buildToggler('left');

        function buildCloser(navID) {
            return function () {
                $mdSidenav(navID).close()
                    .then(function () {
                        document.getElementById('leftNav').blur();
                    });
            };
        }

        function buildToggler(navID) {
            return function () {
                $mdSidenav(navID).toggle();
            };
        }

        // List of teams for which to hide vis demo video and custom view advert
        // TODO: get this list based on team property isEnterprise so we don't need to maintain it
        $scope.enterpriseCloudList = ['atlasdevices', 'atlas-drugdelivery', 'atlas-drugdelivery-dev', 'atlas', 'atlas-dev', 'atlas-molecules', 'atlas-molecules-dev', 'cmrtoolkit', 'aspi', 'rhodiumcredit', 'rhodiumgroup', 'rhodiumcgi'];
        $scope.isEnterpriseCloud = $scope.enterpriseCloudList.indexOf($scope.team.subdomain) > -1;

        function showSimpleToast(text = 'An error occurred.', { hideDelay = 3000, parent = null } = {}) {
            return $mdToast.show(
                $mdToast
                    .simple()
                    .textContent(text)
                    .position('top right')
                    .hideDelay(hideDelay)
                    .parent(parent),
            );
        }
    });
