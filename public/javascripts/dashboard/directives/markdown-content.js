angular.module('arraysApp')
    .directive('markdownContent', ['FileUploadService', '$mdToast', function(FileUploadService, $mdToast) {
        return {
            scope: {
                rawContent: '=',
                page: '=',
                datasets: '=',
                dataset: '='
            },
            compile: function() {
                return {
                    pre: function(scope, element, attributes) {
                        //file upload logic---------------------
                        if (scope.page) {
                            scope.markdownUploader = FileUploadService.newUploader('markdown', 'markdownForm', 'page', scope.page);
                        } else if (scope.dataset) {
                            scope.markdownUploader = FileUploadService.newUploader('markdown', 'markdownForm', 'dataset', scope.dataset);
                        }

                        scope.markdownUploader.onCompleteItem = function(fileItem, response, status, header) {
                            if (status === 200) {
                                scope.markdownImage = fileItem.uploadUrls.markdown.publicUrl;
                                $mdToast.show(
                                    $mdToast.simple()
                                        .textContent('Image uploaded!')
                                        .position('top right')
                                        .hideDelay(3000)
                                );
                            }
                        };

                        scope.markdownUploader.onGetSignedUrlError = function(message) {
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent(message)
                                    .position('top right')
                                    .hideDelay(3000)
                            );
                        };
                        // end file upload logic-----------------

                        // markdown logic-------------
                        scope.onFullScreenCallback = function(e) {
                            e.showPreview();
                        };

                        scope.onFullScreenExitCallback = function(e) {
                            e.hidePreview();
                        };

                        // in the future we can integrate the dropZone with the markdown editor
                        // might make the process easier with ability to drag and drop
                        scope.onImageUploadCallback = function(e) {
                            var $uploaderInput = $('#' + scope.markdownModel + '-uploader');
                            $uploaderInput.click();
                            scope.$watch('markdownImage', function() {
                                if (scope.markdownImage !== undefined) {
                                    var markdownToInsert = '\n![enter image description here](' + scope.markdownImage + ' "enter image title here")\n';

                                    // reset the markdownImage var so there are no duplicates
                                    scope.markdownImage = undefined;

                                    e.replaceSelection(markdownToInsert);
                                    scope.rawContent = e.getContent();
                                    scope.$parent.primaryAction.display();
                                }
                            });
                        };

                        scope.onVisualizationCallback = function(e) {
                            var $button = e.$textarea.closest('.md-editor').find('button[data-handler="bootstrap-markdown-cmdVisualization"]');
                            // Transform the button into a bootstrap dropdown menu button.
                            // The list of options would be set as html code in the .after() method.
                            if ($('#viz-dropdown').length === 0) {

                                $button.attr('data-toggle', 'dropdown')
                                    .after('<ul id="viz-dropdown" class="dropdown-menu"></ul>');

                                for (var i = 0; i < scope.datasets.length; i++) {
                                    var dataset = scope.datasets[i];
                                    $('#viz-dropdown').append('<li id="' + i + '" class="viz-list-item">' + dataset.title + '</li>');
                                }
                            }

                            $('.viz-list-item').off().on('click', function(event) {
                                var index = parseInt($(this).attr('id'), 10);
                                var dataset = scope.datasets[index];

                                // translating the default view into what matches routing
                                var default_view_url = _.kebabCase(dataset.fe_views.default_view);

                                var markdownChart = '\n<chart data-source-key="' + dataset.uid + '" data-chart-type="' + default_view_url + '" class="chart" data-revision="' + dataset.importRevision + '" />\n';
                                e.replaceSelection(markdownChart);
                                scope.rawContent = e.getContent();
                                // setting the parent scope
                                // without this, the parent scope isn't being updated until a different click event is triggered
                                scope.$parent.rawBody = scope.rawContent;
                                scope.$parent.primaryAction.display();
                            });
                        };
                        // end markdown logic-------------------

                        scope.markdownModel = attributes.markdownModel;
                        scope.markdownLabel = attributes.markdownLabel;
                    }
                };
            },
            templateUrl: function(element, attributes) {
                if (attributes.includeViz) {
                    return 'templates/blocks/page.markdown.includeViz.html';
                } else {
                    return 'templates/blocks/page.markdown.simple.html';
                }
            }
        };
    }]);
