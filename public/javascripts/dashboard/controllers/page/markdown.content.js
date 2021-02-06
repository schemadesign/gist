angular.module('arraysApp')
    .controller('BasePageMarkdownContentCtrl', ['$scope', '$state', '$q', 'AuthService', '$mdToast', '$window', '$rootScope', 'Page', '$filter',
        function ($scope, $state, $q, AuthService, $mdToast, $window, $rootScope, Page, $filter) {
            $scope.$parent.$parent.currentNavItem = 'content';
            $scope.$parent.$parent.page = $scope.page;
            $scope.rawBody = $scope.page.rawBody;

            $scope.primaryAction.text = 'Save';
            $scope.primaryAction.disabled = false;

            $scope.primaryAction.do = function(ev) {
                $scope.submitForm();
            };

            $scope.secondaryAction.text = 'Cancel';
            $scope.secondaryAction.disabled = false;

            $scope.secondaryAction.do = function (ev) {
                $scope.revertChanges(true);
            };

            $scope.primaryAction.display = function() {
                $scope.primaryAction.show = true;
                $scope.markdownForm.$setDirty();
                $scope.$apply();
            };

            $scope.thirdAction.text = 'Back';
            $scope.thirdAction.disabled = false;

            $scope.thirdAction.do = function (ev) {
                let prevStep = $scope.$parent.$parent.prevStep || 'dashboard.dataset.list';

                if (!$scope.$parent.$parent.prevStep && $scope.$parent.$parent.currentStep) {
                    const { currentStep = '' } = $scope.$parent.$parent;
                    const result = currentStep.match(/(dashboard\.)\w+(\.markdown.content)/ig);

                    if (result.length) {
                        const view = result[0].split('.')[1];

                        prevStep = `dashboard.${view}.list`;
                    }
                }

                $state.go(prevStep, { site_id: $scope.page.website._id });
            };


            $scope.checkSlug = function() {
                if ($scope.page.slug === 'overview') {
                    return;
                }

                var slug = $filter('slugify')($scope.page.pageTitle);
                var params = {
                    slug: slug,
                    team: $scope.team._id,
                    website: $scope.page.website._id
                };

                Page.search(params).then(
                    function(res) {
                        if (res.data.length === 0) {
                            if (/^[0-9a-zA-Z_-]*$/.test(slug)) {
                                $scope.markdownForm.title.$setValidity('unique', true);
                                $scope.markdownForm.title.$setValidity('pattern', true);
                            } else {
                                $scope.markdownForm.title.$setValidity('unique', true);
                                $scope.markdownForm.title.$setValidity('pattern', false);
                            }
                            // if changing the title and is valid, change the slug
                            $scope.page.slug = slug;
                        } else {
                            $scope.markdownForm.title.$setValidity('unique', false);
                        }
                    },
                    function(err) {}
                );

                $scope.primaryAction.display();
            };

            $scope.revertChanges = function(onPage) {
                $mdToast.show(
                    $mdToast.simple()
                        .textContent('Changes reverted.')
                        .position('top right')
                        .hideDelay(3000)
                );

                if (onPage) {
                // simplest way to refresh page content, although causes flash
                // TODO reset view visibiliy checkboxes and default view indicators
                    $state.reload();
                }
            };

            $scope.submitForm = function() {
                $scope.page.rawBody = $scope.rawBody;
                $scope.page.rawSummary = $scope.rawSummary;
                $scope.page.rawAbout = $scope.rawAbout;

                Page.update($scope.page).then(function(page) {

                    $mdToast.show(
                        $mdToast.simple()
                            .textContent('Article saved.')
                            .position('top right')
                            .hideDelay(3000)
                    );

                    $scope.markdownForm.$setPristine();
                    if ($scope.markdownFormInner) {
                        $scope.markdownFormInner.$setPristine();
                    }
                    // $state.go('dashboard.page.list');

                }, function(err) {
                    $mdToast.show(
                        $mdToast.simple()
                            .textContent(err.message)
                            .position('top right')
                            .hideDelay(3000)
                    );
                });
            };
        }
    ])
    .controller('PageMarkdownContentCtrl', ['$controller', '$scope', 'page', 'datasets', '$compile',
        function ($controller, $scope, page, datasets, $compile) {

            $scope.page = page;
            $scope.datasets = datasets;

            angular.extend(this, $controller('BasePageMarkdownContentCtrl', {
                $scope: $scope
            }));

            // Show Save and Cancel buttons after page has been edited
            $scope.$watch('markdownForm.$dirty', function (newValue, oldValue, scope) {
                $scope.primaryAction.text = scope.markdownForm.$dirty ? 'Save' : '';
                $scope.secondaryAction.text = scope.markdownForm.$dirty ? 'Cancel' : '';
            });

            var compiledBodyHTML = $compile('<div markdown-content markdown-model=\'rawBody\' markdown-label=\'Page Content\' raw-content=\'rawBody\' page=\'page._id\' include-viz=\'true\' datasets=\'datasets\'></div>')($scope);
            $('#form-container').append(compiledBodyHTML);
            var compiledThumbnailHTML = $compile('<div file-upload form=\'markdownForm\' image-type=\'thumbnail\' upload-text=\'Upload a Banner Image\' existing-image=\'page.thumbnail\' page=\'page\'></div>')($scope);
            $('#form-container').append(compiledThumbnailHTML);

        }
    ]);
