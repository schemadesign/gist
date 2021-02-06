angular.module('arraysApp')
    .controller('BaseArticleListCtrl', ['$scope', '$filter', '$mdDialog', '$state', '$mdToast', '$window', 'Website',
        'Page', 'Permissions', 'AuthService',
        function ($scope, $filter, $mdDialog, $state, $mdToast, $window, Website, Page, Permissions, AuthService) {
            const isEditRole = Permissions.isEditRole;

            $scope.primaryAction.show = _.includes($scope.user.canCreateNewArticle, $scope.team._id) || isEditRole;

            $scope.options = {
                controls: ['bold', 'italic', 'strikethrough', 'separator', 'heading', 'bullets', 'indent', 'code', 'separator', 'link', 'quote', 'separator', 'preview'],
            };

            $scope.orderCond = '"-createdAt"';

            $scope.sortCriteria = {
                sortLabel: 'Sort By Date',
                sortValue: '-createdAt',
                sortKind: 1,
            };

            $scope.primaryAction.disabled = false;

            $scope.secondaryAction.text = '';
            $scope.thirdAction.text = '';

            $scope.primaryAction.do = function (ev) {
                $scope.openAddNewPageDialog(ev);
            };

            $scope.secondaryAction.do = function () {
                $state.go('dashboard.site.list');
            };

            var addPage = function (page, hideDialog, callback) {
                page.isArticle = true;

                Page.save(page).then(
                    function ({ data }) {
                        AuthService.updateUser(data.createdBy);

                        $mdToast.show(
                            $mdToast
                                .simple()
                                .textContent('New Article created!')
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
                                .textContent(err.message)
                                .position('top right')
                                .hideDelay(3000),
                        );
                    },
                );
            };

            $scope.copyPage = function (page) {
                $scope.newPage = {};
                $scope.newPage.copyOf = page._id;
                $scope.newPage.createdBy = $scope.user._id;
                $scope.newPage.team = $scope.team._id;
                $scope.newPage.makeCopy = true;
                $scope.newPage.published = false;
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
                                .textContent('Article updated')
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
                            user: $scope.user,
                            team: $scope.team,
                            website: $scope.website,
                            modelName: 'Article',
                        },
                    })
                    .then(function (page) {
                            $scope.pages.push(page);
                        },
                        function () {
                            // Cancelled
                        });
            };

            function AddPageDialogController($scope, $mdDialog, Team, user, team, website, modelName) {
                $scope.newPage = {
                    createdBy: user._id,
                    team: team._id,
                    website: website,
                };

                $scope.modelName = modelName;

                $scope.hide = function () {
                    $mdDialog.hide();
                };
                $scope.cancel = function () {
                    $mdDialog.cancel();
                };

                $scope.checkSlug = function () {
                    var params = {
                        slug: $scope.newPage.slug,
                        team: $scope.newPage.team,
                        website: website._id,
                    };

                    // set touched to true manually since slug is being added programatically
                    $scope.vm.addPageForm.slug.$touched = true;

                    Page.search(params).then(
                        function (response) {
                            if (response.data.length === 0) {
                                if (/^[0-9a-zA-Z_-]*$/.test($scope.newPage.slug)) {
                                    $scope.vm.addPageForm.slug.$setValidity('unique', true);
                                    $scope.vm.addPageForm.slug.$setValidity('pattern', true);
                                } else {
                                    $scope.vm.addPageForm.slug.$setValidity('unique', true);
                                    $scope.vm.addPageForm.slug.$setValidity('pattern', false);
                                }
                            } else {
                                $scope.vm.addPageForm.slug.$setValidity('unique', false);
                            }
                        },
                        function () {},
                    );
                };

                // Automatically suggest slug
                $scope.$watch('newPage.pageTitle', function (newValue, oldValue, scope) {
                    $scope.newPage.slug = $filter('slugify')(scope.newPage.pageTitle);
                });

                $scope.addPage = function () {
                    addPage($scope.newPage, true);
                };
            }

            $scope.checkSiteTitle = function () {
                var slug = $filter('slugify')($scope.website.title);
                var params = { slug: slug, team: $scope.team._id };

                Website.search(params).then(
                    function (response) {
                        if (response.data.length === 0) {
                            if (/^[0-9a-zA-Z_-]*$/.test(slug)) {
                                $scope.siteTitleForm.title.$setValidity('unique', true);
                                $scope.siteTitleForm.title.$setValidity(
                                    'pattern',
                                    true,
                                );
                            } else {
                                $scope.siteTitleForm.title.$setValidity('unique', true);
                                $scope.siteTitleForm.title.$setValidity(
                                    'pattern',
                                    false,
                                );
                            }
                        } else {
                            $scope.siteTitleForm.title.$setValidity('unique', false);
                        }
                    },
                    function () {},
                );
            };

            // note: do we need both sortKind and orderCond and sortValue? it seems redundant
            $scope.updateSort = function (ev, value, kind) {

                $scope.sortCriteria.sortLabel = angular.element(ev.target).text();
                $scope.sortCriteria.sortValue = value;
                $scope.sortCriteria.sortKind = kind;

                if (kind === 1) {
                    $scope.orderCond = '"-createdAt"';
                } else if (kind === 2) {
                    $scope.orderCond = '"pageTitle"';
                }
            };

            $scope.select = function (page) {
                $scope.$parent.$parent.prevStep = 'dashboard.article.list';
                $state.go('dashboard.article.markdown.content', { id: page._id });
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

                                $scope.pages = $scope.pages.filter(function (a) {
                                    return a._id !== page._id;
                                });

                                $mdToast.show(
                                    $mdToast.simple()
                                        .textContent('Article deleted.')
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
                var url = $scope.subdomain + '/' + page.website.slug + '/page/' + page.slug + '?preview=true';
                return url;
            };

            $scope.view = function (page) {
                var url = $scope.constructUrl(page);
                $window.open(url, '_blank');
            };

        },
    ])
    .controller('ArticleListCtrl', ['$scope', '$controller', 'pages', 'Permissions', 'AuthService',
        function ($scope, $controller, pages, Permissions, AuthService) {
            const { _articleEditors = [], _articleViewers = [] } = AuthService.currentUser();
            const isEditRole = Permissions.isEditRole;
            const articles = [..._articleEditors, ..._articleViewers];

            $scope.primaryAction.text = 'New Article';
            $scope.pages = isEditRole ? pages : pages.filter(({ _id }) => articles.includes(_id));
            $scope.canEdit = canEdit;

            function canEdit(datasetId) {
                const { _articleEditors: editors = []} = AuthService.currentUser();

                return editors.includes(datasetId) || isEditRole;
            }

            angular.extend(this, $controller('BaseArticleListCtrl', {
                $scope: $scope,
            }));

        },
    ]);
