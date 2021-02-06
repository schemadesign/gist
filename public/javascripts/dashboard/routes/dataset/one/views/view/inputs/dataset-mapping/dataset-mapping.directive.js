function gistViewInputDatasetMapping(DatasetService) {
    return {
        restrict: 'E',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/inputs/dataset-mapping/dataset-mapping.template.html',
        controller($scope) {
            const { viewCtrl, datasetOneCtrl } = $scope;

            $scope.addDatasetMapping = addDatasetMapping;
            $scope.removeDatasetMapping = removeDatasetMapping;
            $scope.loadDatasetColumnsByPkey = loadDatasetColumnsByPkey;
            $scope.checkDuplicateKeyInMapping = checkDuplicateKeyInMapping;

            if ($scope.setting.mappingType === 'dataset') {
                $scope.otherAvailableDatasets = [];

                loadDatasetsForMapping();
            } else if ($scope.setting.mappingType === 'fields') {
                $scope.otherDatasetCols = {};
                const pKey = _.get(viewCtrl.data, [$scope.setting.name, 'pKey']);

                if (pKey) {
                    loadDatasetColumnsByPkey(pKey);
                }
            }

            function loadDatasetsForMapping() {
                DatasetService
                    .getDatasetsWithQuery({
                        _team: $scope.team._id,
                        $or: [
                            { replaced: false },
                            { replaced: { $exists: false } },
                        ],
                    })
                    .then((datasets) => {
                        $scope.otherAvailableDatasets = datasets
                            .filter(({ title }) => title !== datasetOneCtrl.dataset.title)
                            .map(({ _id, title }) => ({
                                mappingPkey: _id,
                                displayAs: title,
                            }));
                    })
                    .catch(_.noop);
            }

            function addDatasetMapping() {
                viewCtrl.data[$scope.setting.name].mappings.push({ key: '', value: '' });
            }

            function removeDatasetMapping(index) {
                viewCtrl.data[$scope.setting.name].mappings.splice(index, 1);
            }

            function loadDatasetColumnsByPkey(pKey) {
                if (!pKey || $scope.otherDatasetCols[pKey]) {
                    return;
                }

                DatasetService
                    .getMappingDatasourceCols(pKey)
                    .then(({ data = {} }) => ($scope.otherDatasetCols[pKey] = data.cols))
                    .catch(_.noop);
            }

            function checkDuplicateKeyInMapping(index) {
                return (column) => notChosen(column, index);
            }

            function notChosen(target, targetIndex) {
                return !viewCtrl.data[$scope.setting.name].mappings.some(({ key }, index) => (targetIndex !== index && key === target));
            }
        },
    };
}

angular.module('arraysApp')
    .directive('gistViewInputDatasetMapping', gistViewInputDatasetMapping);
