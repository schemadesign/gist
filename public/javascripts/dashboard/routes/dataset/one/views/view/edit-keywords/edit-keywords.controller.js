function EditKeywordsController($scope, $mdDialog, DatasetService, datasetId, field, currentKeywords, STOP_WORDS) {
    const editKeywordsController = this;
    const wordsLimit = 1000;
    const toastDelay = 3000;
    const { dashboardCtrl } = $scope;

    editKeywordsController.keywords = [];
    editKeywordsController.element = null;
    editKeywordsController.loading = true;
    editKeywordsController.excludeStopWords = true;
    editKeywordsController.keywordFilter = '';
    editKeywordsController.currentPage = 1;
    editKeywordsController.selectedItems = 0;
    editKeywordsController.paginationLimit = 100;
    editKeywordsController.onClick = onClick;
    editKeywordsController.selectAll = selectAll;
    editKeywordsController.selectNone = selectNone;
    editKeywordsController.cancel = cancel;
    editKeywordsController.save = save;
    editKeywordsController.changePage = changePage;
    editKeywordsController.filterKeywords = filterKeywords;

    DatasetService.getKeywords(datasetId, field)
        .then(({ data: keywords }) => {
            keywords.forEach((keyword) => {
                keyword.selected = currentKeywords.includes(keyword.word);
            });
            editKeywordsController.selectedItemsLength = keywords.filter(({ selected }) => selected).length;
            editKeywordsController.keywords = keywords;
            editKeywordsController.loading = false;
            editKeywordsController.filterKeywords();
            editKeywordsController.element = $('.field-dialog-content');
        })
        .catch((err) => {
            console.log(err);
        });

    const showToast = _.throttle(() => {
        dashboardCtrl.showSimpleToast('Max 1000 keywords', {
            hideDelay: toastDelay,
            parent: editKeywordsController.element,
        });
    }, toastDelay, { trailing: false });

    function onClick(item) {
        if (editKeywordsController.selectedItemsLength >= wordsLimit && item.selected) {
            item.selected = false;
            showToast();
            return;
        }

        if (item.selected) {
            editKeywordsController.selectedItemsLength++;
        } else {
            editKeywordsController.selectedItemsLength--;
        }
    }

    function selectAll() {
        const nonSelectedItems = editKeywordsController.filteredKeywords.filter(({ selected }) => !selected);
        const selectLimit = wordsLimit - editKeywordsController.selectedItemsLength;

        nonSelectedItems.slice(0, selectLimit).forEach((keyword) => {
            keyword.selected = true;
        });

        editKeywordsController.selectedItemsLength = wordsLimit;
    }

    function selectNone() {
        editKeywordsController.filteredKeywords.forEach((keyword) => {
            keyword.selected = false;
        });

        editKeywordsController.selectedItemsLength = 0;
    }

    function cancel() {
        $mdDialog.cancel();
    }

    function save() {
        const selectedKeywords = editKeywordsController.keywords
            .filter(({ selected }) => selected)
            .map(({ word }) => word);

        $mdDialog.hide(selectedKeywords);
    }

    function changePage(currentPage) {
        const { filteredKeywords } = editKeywordsController;
        const startSlice = (currentPage - 1) * editKeywordsController.paginationLimit;
        const endSlice = startSlice + editKeywordsController.paginationLimit;
        editKeywordsController.displayedKeywords = _.slice(filteredKeywords, startSlice, endSlice);
    }

    function filterKeywords() {
        editKeywordsController.filteredKeywords = editKeywordsController.keywords;

        if (editKeywordsController.excludeStopWords) {
            editKeywordsController.filteredKeywords = editKeywordsController.keywords
                .filter(((keyword) => {
                    const isStopWord = _.includes(STOP_WORDS, keyword.word);
                    if (isStopWord) {
                        keyword.selected = false;
                    }
                    return !isStopWord;
                }));
        }

        if (!_.isEmpty(editKeywordsController.keywordFilter)) {
            editKeywordsController.filteredKeywords = editKeywordsController.filteredKeywords
                .filter(({ word }) => _.includes(word, editKeywordsController.keywordFilter));
        }

        editKeywordsController.numberOfItems = editKeywordsController.filteredKeywords.length;
        editKeywordsController.changePage(1);
    }
}

angular.module('arraysApp')
    .controller('EditKeywordsController', EditKeywordsController);
