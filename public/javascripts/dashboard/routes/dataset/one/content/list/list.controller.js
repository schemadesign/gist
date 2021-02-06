function ContentListCtrl($scope, $state, $location, entries, Content, $mdDialog, CONTENT_LIST_PAGE_LIMIT, $document) {
    const contentListCtrl = this;
    const { datasetCtrl, datasetOneCtrl } = $scope;

    datasetOneCtrl.dataset.updatedContent = entries.updatedContent;
    contentListCtrl.entries = entries.entries;
    contentListCtrl.paging = {
        itemsPerPage: CONTENT_LIST_PAGE_LIMIT,
        totalItems: entries.numberOfEntries,
        currentPage: _.toInteger($location.search().page) || 1,
        totalPages: parseInt(entries.numberOfEntries / CONTENT_LIST_PAGE_LIMIT) + 1,
    };
    contentListCtrl.filterList = [
        { key: 'all', name: 'All' },
        { key: 'published', name: 'Published' },
        { key: 'unpublished', name: 'Unpublished' },
        { key: 'edited', name: 'Edited' },
        { key: 'created', name: 'Created' },
    ];
    contentListCtrl.sortList = [
        { key: 'objectTitle', name: 'Object Title' },
        { key: 'updatedAt', name: 'Last Updated' },
    ];
    contentListCtrl.filterBy = $location.search().filterBy || contentListCtrl.filterList[0].key;
    contentListCtrl.sortBy = contentListCtrl.sortList[0].key;
    contentListCtrl.entriesLoaded = true;
    contentListCtrl.filterByTitle = $location.search().title || '';
    contentListCtrl.queryUpdated = _.debounce(queryUpdated, 1000);
    contentListCtrl.editEntry = editEntry;
    contentListCtrl.updateEntryStatus = updateEntryStatus;
    contentListCtrl.removeEntry = removeEntry;
    contentListCtrl.getFilterName = getFilterName;
    contentListCtrl.imageUrl = (pKey, updatedAt) => `https://${$scope.env.s3Bucket}.nyc3.digitaloceanspaces.com/${datasetOneCtrl.dataset._team.subdomain.toLowerCase()}/datasets/${datasetOneCtrl.dataset._id}/assets/images/timeline/${pKey}${updatedAt ? `?updatedAt=${updatedAt}` : ''}`;

    function queryUpdated() {
        contentListCtrl.entriesLoaded = false;

        if (!contentListCtrl.paging.currentPage) {
            contentListCtrl.paging.currentPage = contentListCtrl.paging.totalPages;
        } else if (contentListCtrl.paging.currentPage < 1) {
            contentListCtrl.paging.currentPage = 1;
        }

        const query = {
            datasetId: datasetOneCtrl.dataset._id,
            page: contentListCtrl.paging.currentPage,
            sort: contentListCtrl.sortBy,
            limit: CONTENT_LIST_PAGE_LIMIT,
            filter: contentListCtrl.filterBy,
            title: contentListCtrl.filterByTitle,
        };

        const filterBy = contentListCtrl.filterBy !== contentListCtrl.filterList[0].key ? contentListCtrl.filterBy : null;
        const sortBy = contentListCtrl.sortBy !== contentListCtrl.sortList[0].key ? contentListCtrl.sortBy : null;
        const page = contentListCtrl.paging.currentPage > 1 ? contentListCtrl.paging.currentPage : null;

        $location.search('title', query.title || null);
        $location.search('page', page);
        $location.search('filterBy', filterBy);
        $location.search('sortBy', sortBy);

        return Content
            .query(query)
            .$promise
            .then(({ entries, numberOfEntries }) => {
                contentListCtrl.entries = entries;
                contentListCtrl.paging.totalItems = numberOfEntries;
            })
            .catch(datasetCtrl.showGenericErrorToast)
            .then(() => (contentListCtrl.entriesLoaded = true));
    }

    function editEntry(entryId) {
        return $state
            .go('dashboard.dataset.one.content.edit', {
                id: datasetOneCtrl.dataset._id,
                entryId,
            })
            .catch(datasetCtrl.showGenericErrorToast);
    }

    function updateEntryStatus({ _id, rowParams, published }) {
        return Content
            .update({
                datasetId: datasetOneCtrl.dataset._id,
                entryId: _id,
            }, { published })
            .$promise
            .then(() => {
                const status = published ? 'published' : 'unpublished';
                datasetCtrl.showSimpleToast(`${rowParams[datasetOneCtrl.dataset.objectTitle]} ${status}`);
            })
            .catch(datasetCtrl.showGenericErrorToast);
    }

    function removeEntry(entry, event) {
        return $mdDialog
            .show({
                templateUrl: 'javascripts/dashboard/routes/dataset/one/content/list/delete-dialog.template.html',
                parent: angular.element($document[0].body),
                targetEvent: event,
                clickOutsideToClose: true,
                fullscreen: true,
                controller($scope, $mdDialog) {
                    $scope.title = entry.rowParams[datasetOneCtrl.dataset.objectTitle];

                    $scope.hide = () => $mdDialog.hide();
                    $scope.cancel = () => $mdDialog.cancel();
                },
            })
            .then(() => {
                Content
                    .remove({
                        datasetId: datasetOneCtrl.dataset._id,
                        entryId: entry._id,
                    })
                    .$promise
                    .then(() => {
                        _.pull(contentListCtrl.entries, entry);

                        datasetCtrl.showSimpleToast(`${entry.rowParams[datasetOneCtrl.dataset.objectTitle]} deleted`);
                    })
                    .catch(datasetCtrl.showGenericErrorToast);
            })
            .catch(_.noop);
    }

    function getFilterName() {
        return contentListCtrl.filterList.find(({ key }) => key === contentListCtrl.filterBy).name;
    }
}

angular.module('arraysApp')
    .controller('ContentListCtrl', ContentListCtrl);
