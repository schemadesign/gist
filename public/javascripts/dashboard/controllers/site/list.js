angular.module('arraysApp')
    .controller('BaseSiteListCtrl', ['$scope', '$filter', '$mdDialog', '$state', '$mdToast', '$window', 'Website',
        'Permissions', 'AuthService',
        function ($scope, $filter, $mdDialog, $state, $mdToast, $window, Website, Permissions, AuthService) {
            const isEditRole = Permissions.isEditRole;

            $scope.primaryAction.text = 'New Site';
            $scope.primaryAction.disabled = false;
            $scope.primaryAction.show = _.includes($scope.user.canCreateNewSite, $scope.team._id) || isEditRole;

            $scope.secondaryAction.text = '';
            $scope.thirdAction.text = '';

            $scope.primaryAction.do = function (ev) {
                $scope.openAddNewSiteDialog(ev);
            };

            const addSite = function (newSite, hideDialog, callback) {
                Website.save(newSite).then(
                    function ({ data }) {
                        AuthService.updateUser(data.createdBy);

                        $mdToast.show(
                            $mdToast
                                .simple()
                                .textContent('New Site created!')
                                .position('top right')
                                .hideDelay(3000),
                        );

                        if (hideDialog) {
                            $mdDialog.hide(data);
                        } else {
                            callback(data);
                        }
                    },
                    function (err) {
                        $mdToast.show(
                            $mdToast
                                .simple()
                                .textContent(err.data)
                                .position('top right')
                                .hideDelay(3000),
                        );
                    },
                );
            };

            $scope.updateStatus = function (site) {
                Website.update(site).then(
                    function (result) {
                        $mdToast.show(
                            $mdToast
                                .simple()
                                .textContent('Site updated')
                                .position('top right')
                                .hideDelay(3000),
                        );
                    }, function (err) {
                        $mdToast.show(
                            $mdToast
                                .simple()
                                .textContent(err.data)
                                .position('top right')
                                .hideDelay(3000),
                        );
                    },
                );
            };

            $scope.openAddNewSiteDialog = function (ev) {
                $mdDialog
                    .show({
                        controller: AddSiteDialogController,
                        templateUrl: 'templates/blocks/site.add.html',
                        parent: angular.element(document.body),
                        targetEvent: ev,
                        clickOutsideToClose: true,
                        fullscreen: true,
                        locals: {
                            user: $scope.user,
                            team: $scope.team,
                            sites: $scope.sites,
                        },
                    })
                    .then(function (site) {
                        $scope.sites.push(site);
                    });
            };

            function AddSiteDialogController($scope, $mdDialog, Team, user, team, sites) {
                $scope.sites = sites;
                $scope.newSite = {};
                $scope.newSite.createdBy = user._id;
                $scope.newSite.team = team._id;

                $scope.hide = function () {
                    $mdDialog.hide();
                };
                $scope.cancel = function () {
                    $mdDialog.cancel();
                };

                $scope.checkSlug = function (origin) {
                    // set touched to true manually since slug is being added programatically
                    $scope.vm.addSiteForm.slug.$touched = true;

                    Website
                        .search({
                            slug: $scope.newSite.slug,
                            team: $scope.newSite.team,
                        })
                        .then(
                            function (response) {
                                if (!response.data.length) {
                                    const isValid = /^[0-9a-zA-Z_-]*$/.test($scope.newSite.slug);

                                    $scope.vm.addSiteForm.slug.$setValidity('unique', true);
                                    $scope.vm.addSiteForm.slug.$setValidity('pattern', isValid);
                                } else {
                                    $scope.vm.addSiteForm.slug.$setValidity('unique', false);
                                }
                            },
                            function (err) {},
                    );
                };

                // Automatically suggest slug
                $scope.$watch('newSite.title', function (newValue, oldValue) {
                    $scope.newSite.slug = $filter('slugify')($scope.newSite.title);
                });

                $scope.addSite = function () {
                    addSite($scope.newSite, true);
                };
            }

            $scope.copySite = function (site) {
                $scope.newSite = {
                    copyOf: site._id,
                    createdBy: $scope.user._id,
                    team: $scope.team._id,
                    makeCopy: true,
                    published: false,
                };

                addSite($scope.newSite, false, function (site) {
                    $scope.sites.push(site);
                });
            };

            $scope.removeSite = function (site, i, ev) {
                $mdDialog
                    .show({
                        templateUrl: 'templates/blocks/site.delete.html',
                        parent: angular.element(document.body),
                        targetEvent: ev,
                        clickOutsideToClose: true,
                        fullscreen: true,
                        locals: {
                            id: site._id,
                            title: site.title,
                        },
                        controller: function ($scope, $mdDialog) {
                            $scope.title = site.title;

                            $scope.hide = function () {
                                $mdDialog.hide();
                            };
                            $scope.cancel = function () {
                                $mdDialog.cancel();
                            };
                        },
                    })
                    .then(function () {
                            Website.remove({ id: site._id })
                                .then(function () {
                                    $scope.sites.splice(i, 1);

                                    $mdToast.show(
                                        $mdToast.simple()
                                            .textContent('Site deleted')
                                            .position('top right')
                                            .hideDelay(3000),
                                    );
                                }, $scope.genericError);
                        },
                        function () {
                            // console.log('You decided to keep your website.');
                        },
                    );
            };

            $scope.select = function (site_id) {
                $state.go('dashboard.page.list', { site_id: site_id });
            };

            $scope.viewSite = function (site) {
                const url = `${ $scope.subdomain }/${ site.slug }?preview=true`;

                $window.open(url, '_blank');
            };
        },
    ])
    .controller('SiteListCtrl', ['$scope', '$controller', 'websites', 'Permissions', 'AuthService',
        function ($scope, $controller, websites, Permissions, AuthService) {
            const { _siteEditors = [], _siteViewers = [] } = AuthService.currentUser();
            const sites = [..._siteEditors, ..._siteViewers];
            const isEditRole = Permissions.isEditRole;

            $scope.sites = isEditRole ? websites.data : websites.data.filter(({ _id }) => sites.includes(_id));
            $scope.canEdit = canEdit;

            // Temporarily set sites to published if property does not exist
            angular.forEach($scope.sites, function (site) {
                if (!site.hasOwnProperty('published')) {
                    site.published = true;
                }
            });

            function canEdit(datasetId) {
                const { _siteEditors: editors = [] } = AuthService.currentUser();

                return editors.includes(datasetId) || isEditRole;
            }

            angular.extend(this, $controller('BaseSiteListCtrl', {
                $scope,
            }));

        },
    ]);
