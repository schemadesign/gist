angular
    .module('arraysApp')
    .config(($stateProvider) => {
        $stateProvider
            .state('dashboard.dataset.one.content.list', {
                url: '',
                templateUrl: 'javascripts/dashboard/routes/dataset/one/content/list/list.template.html',
                controller: 'ContentListCtrl',
                controllerAs: 'contentListCtrl',
                resolve: {
                    entries($location, Content, $transition$, CONTENT_LIST_PAGE_LIMIT) {
                        const { title, page = 1, filterBy, sortBy } = $location.search();

                        return Content
                            .query({
                                datasetId: $transition$.params().id,
                                limit: CONTENT_LIST_PAGE_LIMIT,
                                filter: filterBy,
                                sort: $transition$.params().sortBy || sortBy,
                                title,
                                page,
                            })
                            .$promise;
                    },
                },
            });
    });
