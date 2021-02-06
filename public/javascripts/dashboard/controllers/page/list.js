angular.module('arraysApp')
    .controller('BasePageListCtrl', ['$scope', '$filter', '$mdDialog', '$state', '$mdToast', '$window',
        'Website', 'Page',
        function ($scope, $filter, $mdDialog, $state, $mdToast, $window, Website, Page) {
            const isValidSlug = (slug) => /^[0-9a-zA-Z_-]*$/.test(slug);

            $scope.options = {
                controls: [
                    'bold', 'italic', 'strikethrough', 'separator', 'heading', 'bullets',
                    'indent', 'code','separator', 'link', 'quote', 'separator', 'preview',
                ],
            };

            $scope.orderCond = '\'-createdAt\'';

            $scope.sortCriteria = {
                sortLabel: 'Sort By Date',
                sortValue: '-createdAt',
                sortKind: 1,
            };

            $scope.primaryAction.text = 'New Page';
            $scope.primaryAction.disabled = false;

            $scope.secondaryAction.text = 'Back';
            $scope.thirdAction.text = '';

            $scope.primaryAction.do = function (ev) {
                $scope.openAddNewPageDialog(ev);
            };

            $scope.secondaryAction.do = function () {
                $state.go('dashboard.site.list');
            };

            $scope.setHomepage = function (homepage, site) {
                const updatedSite = _.cloneDeep(site);

                updatedSite.newHomepage = homepage._id;

                Website.update(updatedSite).then(function ({ data }) {
                    $scope.website = data;

                    $mdToast.show(
                        $mdToast.simple()
                            .textContent('Homepage Set')
                            .position('top right')
                            .hideDelay(3000),
                    );

                }, function (err) {
                    $mdToast.show(
                        $mdToast.simple()
                            .textContent(err.message)
                            .position('top right')
                            .hideDelay(3000),
                    );
                });
            };

            const addPage = function (page, hideDialog, callback) {
                Page.save(page).then(
                    function (response) {
                        if (page.homepage) {
                            $scope.setHomepage(response.data, response.data.website);
                        }

                        $mdToast.show(
                            $mdToast
                                .simple()
                                .textContent('New Page created!')
                                .position('top right')
                                .hideDelay(3000),
                        );

                        if (hideDialog) {
                            $mdDialog.hide(response.data);
                        } else {
                            callback(response.data);
                        }
                    },
                    function (err) {
                        $mdToast.show(
                            $mdToast
                                .simple()
                                .textContent(err.message)
                                .position('top right')
                                .hideDelay(3000),
                        );
                    },
                );
            };

            $scope.copyPage = function (page) {
                $scope.newPage = {
                    copyOf: page._id,
                    createdBy: $scope.user._id,
                    team: $scope.team._id,
                    makeCopy: true,
                    published: false,
                };

                addPage($scope.newPage, false, function (page) {
                    $scope.pages.push(page);
                });
            };

            $scope.updateStatus = function (page) {
                Page.update(page).then(
                    function () {
                        $mdToast.show(
                            $mdToast
                                .simple()
                                .textContent('Page updated')
                                .position('top right')
                                .hideDelay(3000),
                        );
                    }, function (err) {
                        $mdToast.show(
                            $mdToast
                                .simple()
                                .textContent(err.message)
                                .position('top right')
                                .hideDelay(3000),
                        );
                    },
                );
            };

            $scope.openAddNewPageDialog = function (ev) {
                $mdDialog
                    .show({
                        controller: AddPageDialogController,
                        templateUrl: 'templates/blocks/page.add.html',
                        parent: angular.element(document.body),
                        targetEvent: ev,
                        clickOutsideToClose: true,
                        fullscreen: true,
                        locals: {
                            setHomepage: $scope.setHomepage,
                            user: $scope.user,
                            team: $scope.team,
                            website: $scope.website,
                            modelName: 'Page',
                        },
                    })
                    .then(
                        function (page) {
                            $scope.pages.push(page);
                        },
                        function () {
                            // Cancelled
                        }
                    );
            };

            function AddPageDialogController($scope, $mdDialog, Team, setHomepage, user, team, website) {
                $scope.newPage = {
                    createdBy: user._id,
                    team: team._id,
                    website: website,
                };

                if (!website.homepage) {
                    $scope.newPage.homepage = true;
                }

                $scope.hide = function () {
                    $mdDialog.hide();
                };
                $scope.cancel = function () {
                    $mdDialog.cancel();
                };

                $scope.checkSlug = function () {
                    const slug = $scope.newPage.slug;

                    Page
                        .search({
                            slug,
                            team: $scope.newPage.team,
                            website: website._id,
                        })
                        .then(
                            function (res) {
                                if (!res.data.length) {
                                    const isValid = isValidSlug(slug);

                                    $scope.vm.addPageForm.slug.$setValidity('unique', true);
                                    $scope.vm.addPageForm.slug.$setValidity('pattern', isValid);
                                } else {
                                    $scope.vm.addPageForm.slug.$setValidity('unique', false);
                                }
                            },
                    );
                };

                // Automatically suggest slug
                $scope.$watch('newPage.pageTitle', function (newValue, oldValue, scope) {
                    scope.newPage.slug = $filter('slugify')(scope.newPage.pageTitle);
                });

                $scope.addPage = function () {
                    addPage($scope.newPage, true);
                };
            }

            $scope.checkSiteTitle = function() {
                const slug = $filter('slugify')($scope.website.title);

                Website
                        .search({
                            slug,
                            team: $scope.team._id,
                        })
                        .then(
                            function (response) {
                                if (!response.data.length) {
                                    const isValid = isValidSlug(slug);

                                    $scope.siteTitleForm.title.$setValidity('unique', true);
                                    $scope.siteTitleForm.title.$setValidity('pattern', isValid);
                                } else {
                                    $scope.siteTitleForm.title.$setValidity('unique', false);
                                }
                            },
                    );
            };

            $scope.saveSiteTitle = function (site) {
                site.slug = $filter('slugify')(site.title);

                Website.update(site).then(function () {

                    $mdToast.show(
                        $mdToast.simple()
                            .textContent('Site Title Saved')
                            .position('top right')
                            .hideDelay(3000),
                    );

                    $scope.siteTitleForm.$setPristine();

                }, function (err) {
                    $mdToast.show(
                        $mdToast.simple()
                            .textContent(err.message)
                            .position('top right')
                            .hideDelay(3000),
                    );
                });
            };

            // note: do we need both sortKind and orderCond and sortValue? it seems redundant
            $scope.updateSort = function (ev, value, kind) {

                $scope.sortCriteria.sortLabel = angular.element(ev.target).text();
                $scope.sortCriteria.sortValue = value;
                $scope.sortCriteria.sortKind = kind;

                if (kind === 1) {
                    $scope.orderCond = '\'-createdAt\'';
                } else if (kind === 2) {
                    $scope.orderCond = '\'pageTitle\'';
                }
            };

            $scope.select = function (page) {
                $scope.$parent.$parent.prevStep = 'dashboard.page.list';
                $state.go('dashboard.page.markdown.content', { id: page._id });
            };

            $scope.remove = function (page, ev) {
                $mdDialog.show({
                    templateUrl: 'templates/blocks/page.delete.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: true,
                    locals: {
                        id: page._id,
                        title: page.pageTitle,
                    },
                    controller: function ($scope, $mdDialog) {
                        $scope.title = page.pageTitle;

                        $scope.hide = function () {
                            $mdDialog.hide();
                        };
                        $scope.cancel = function () {
                            $mdDialog.cancel();
                        };
                    },
                })
                    .then(function () {
                        Page.remove({ id: page._id }).then(function (response) {
                            if (response.status === 200) {
                                $scope.website = response.data;

                                $scope.pages = $scope.pages.filter(function (a) {
                                    return a._id !== page._id;
                                });

                                $mdToast.show(
                                    $mdToast.simple()
                                        .textContent('Page deleted.')
                                        .position('top right')
                                        .hideDelay(3000),
                                );
                            }
                        }, function (error) {
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent(error.data)
                                    .position('top right')
                                    .hideDelay(3000),
                            );
                        });
                    }, function () {
                        // console.log('You decided to keep your dataset.');
                    });
            };

            // Add to $scope for extension
            $scope.constructUrl = function (page) {
                let url = `${ $scope.subdomain }/${ page.website.slug }`;

                if (page.website.homepage !== page._id) {
                    url += `/page/${ page.slug }`;
                }

                return `${ url }?preview=true`;
            };

            $scope.view = function (page) {
                const url = $scope.constructUrl(page);

                $window.open(url, '_blank');
            };

        },
    ])
    .controller('PageListCtrl', ['$scope', '$controller', 'pages', 'website',
        function ($scope, $controller, pages, website) {
            $scope.pages = pages;
            $scope.website = website.data;

            // Temporarily set pages to published if property does not exist
            if ($scope.pages.length > 0) {
                $scope.pages = $scope.pages.map(function (page) {
                    if (!page.hasOwnProperty('published')) {
                        page.published = true;
                    }
                    return page;
                });
            }

            angular.extend(this, $controller('BasePageListCtrl', {
                $scope,
            }));
        },
    ]);
