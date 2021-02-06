function ContentCreateCtrl($scope, $state, Content) {
    const contentCreateCtrl = this;
    const { datasetCtrl, datasetOneCtrl } = $scope;

    contentCreateCtrl.entry = {
        srcDocPKey: datasetOneCtrl.dataset._id,
        published: false,
        rowParams: {},
    };

    // Initialize entry with empty property values so fields will exist in db
    _.forEach(datasetOneCtrl.dataset.columns, ({ name }) => (contentCreateCtrl.entry.rowParams[name] = null));

    $scope.$on('contentSaveForm', () => {
        if (contentCreateCtrl.form.$invalid) {
            return;
        }

        if (contentCreateCtrl.form.$pristine) {
            $state.go('dashboard.dataset.one.content.list');
            return;
        }

        const savedData = _.cloneDeep(contentCreateCtrl.entry);

        const markdownFields = datasetOneCtrl.dataset.columns
            .filter(({ data_type }) => data_type === 'Markdown')
            .map(({ name }) => name);

        savedData.markdowns = markdownFields.reduce((result, value) => {
            result[value] = savedData.rowParams[value];

            if (savedData.rowParams[value]) {
                savedData.rowParams[value] = arrays.subtractMarkdown(savedData.rowParams[value]);
            }

            return result;
        }, {});

        Content
            .save({ datasetId: datasetOneCtrl.dataset._id }, savedData)
            .$promise
            .then(() => {
                datasetCtrl.showSimpleToast('Entry saved');

                datasetOneCtrl.dataset.contentEdited = true;
                datasetOneCtrl.originalDataset.contentEdited = true;

                $state.go('dashboard.dataset.one.content.list', { sortBy: 'updatedAt' });
            })
            .catch(datasetCtrl.showGenericErrorToast);
    });
}

angular.module('arraysApp')
    .controller('ContentCreateCtrl', ContentCreateCtrl);
