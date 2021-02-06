function ContentEditCtrl($scope, $state, entry, Content, FileUploadService, DatasetService) {
    const contentEditCtrl = this;
    const { datasetCtrl, datasetOneCtrl } = $scope;
    const { markdowns = {}, rowParams } = entry;
    contentEditCtrl.entry = entry;
    contentEditCtrl.title = arrays.subtractMarkdown(contentEditCtrl.entry.rowParams[datasetOneCtrl.dataset.objectTitle]);
    contentEditCtrl.imageUrl = `https://${$scope.env.s3Bucket}.nyc3.digitaloceanspaces.com/${datasetOneCtrl.dataset._team.subdomain.toLowerCase()}/datasets/${datasetOneCtrl.dataset._id}/assets/images/gallery/${contentEditCtrl.entry.pKey}${contentEditCtrl.entry.updatedAt ? `?updatedAt=${contentEditCtrl.entry.updatedAt}` : ''}`;

    _.forEach(datasetOneCtrl.dataset.columns, ({ name, operation }) => {
        const value = contentEditCtrl.entry.rowParams[name];
        const expectedOperations = ['ToInteger', 'ToFloat'];

        if (_.isString(value) && expectedOperations.includes(operation)) {
            const valueWithoutComma = value.replace(/,/g, '');
            const converseFunction = expectedOperations[0] === operation ? Number.parseInt : Number.parseFloat;

            contentEditCtrl.entry.rowParams[name] = converseFunction(valueWithoutComma);
        }
    });

    const formattedEntries = _.cloneDeep(contentEditCtrl.entry);
    contentEditCtrl.entry.rowParams = _.merge(rowParams, markdowns);

    $scope.$on('contentSaveForm', () => {
        if (contentEditCtrl.form.$invalid) {
            return;
        }

        if (contentEditCtrl.form.$pristine) {
            $state.go('dashboard.dataset.one.content.list');
            return;
        }

        const saveEntity = _.cloneDeep(contentEditCtrl.entry);

        saveEntity.rowParams = _.omitBy(saveEntity.rowParams, (value) => _.isNil(value) || _.isNaN(value));

        if (!formattedEntries.markdowns) {
            formattedEntries.markdowns = {};
        }

        saveEntity.rowParams = _.reduce(saveEntity.rowParams, (result, value, key) => {
            value = formattedEntries.markdowns[key] ? arrays.subtractMarkdown(value) : value;
            if (value !== formattedEntries.rowParams[key]) {
                result[key] = value;
            }

            return result;
        }, {});

        if (!_.isEmpty(formattedEntries.markdowns)) {
            saveEntity.markdowns = _.reduce(contentEditCtrl.entry.rowParams, (result, value, key) => {
                const markdown = formattedEntries.markdowns[key];

                if (value === markdown || _.isNil(markdown)) {
                    return result;
                }

                result[key] = value;

                return result;
            }, {});
        }

        _.forEach(saveEntity.rowParams, (value, key) => {
            if (Array.isArray(value)) {
                _.unset(saveEntity.rowParams, key);
            }
        });

        Content
            .update({
                datasetId: datasetOneCtrl.dataset._id,
                entryId: contentEditCtrl.entry._id,
            }, saveEntity)
            .$promise
            .then(() => {
                datasetCtrl.showSimpleToast('Entry updated');

                datasetOneCtrl.dataset.contentEdited = true;
                datasetOneCtrl.originalDataset.contentEdited = true;

                if (contentEditCtrl.form.$imageRescrape) {
                    DatasetService.postScrapeImages(datasetOneCtrl.dataset._id, [contentEditCtrl.entry._id]);
                }

                $state.go('dashboard.dataset.one.content.list');
            })
            .catch(datasetCtrl.showGenericErrorToast);
    });

    $scope.entryImagesUploader = FileUploadService.entryImageUploader('images/source', 'entryForm', 'dataset', datasetOneCtrl.dataset._id, contentEditCtrl.entry.rowParams[datasetOneCtrl.dataset.objectTitle]);
    $scope.entryImagesUploader.onCompleteItem = (fileItem, response, status) => {
        if (status === 200) {
            contentEditCtrl.entry.rowParams[datasetOneCtrl.dataset.fe_image.field] = fileItem.uploadUrls['images/source'].publicUrl;
            contentEditCtrl.imageUrl = fileItem.uploadUrls['images/source'].publicUrl;
            contentEditCtrl.imageUrl += '?updatedAt' + Math.random();
            datasetOneCtrl.form.$pristine = false;
            contentEditCtrl.form.$pristine = false;
            contentEditCtrl.form.$imageRescrape = true;
        } else {
            datasetCtrl.showSimpleToast('Could not upload image');
        }
    };
}

angular.module('arraysApp')
    .controller('ContentEditCtrl', ContentEditCtrl);
