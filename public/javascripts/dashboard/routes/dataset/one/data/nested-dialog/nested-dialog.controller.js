angular.module('arraysApp')
    .controller('NestedDialogCtrl', ['$scope', '$mdDialog', '$filter', 'dataset', 'additionalDatasources',
        function ($scope, $mdDialog, $filter, dataset, additionalDatasources) {

            $scope.reset = function () {
                $scope.dataset = angular.copy(dataset);
                $scope.additionalDatasources = angular.copy(additionalDatasources);

                // Master datasource
                $scope.data = {};

                if (!$scope.dataset.fe_nestedObject) {
                    $scope.dataset.fe_nestedObject = {};
                }
                if (!$scope.dataset.fe_nestedObject.criteria || !$scope.dataset.fe_nestedObject.criteria.fieldName) {
                    $scope.dataset.fe_nestedObject.criteria = {
                        operatorName: 'equal',
                        value: '',
                    };
                }

                if (!$scope.dataset.fe_nestedObject.fields) {
                    $scope.dataset.fe_nestedObject.fields = [];
                }

                if (!$scope.dataset.fe_nestedObject.fieldOverrides) {
                    $scope.dataset.fe_nestedObject.fieldOverrides = {};
                }
                $scope.data.fieldOverrides = [];
                // Convert Object into Array
                Object.keys($scope.dataset.fe_nestedObject.fieldOverrides).map(function (colName) {
                    $scope.data.fieldOverrides.push({
                        field: colName,
                        override: $scope.dataset.fe_nestedObject.fieldOverrides[colName],
                    });
                });

                if (!$scope.dataset.fe_nestedObject.valueOverrides) {
                    $scope.dataset.fe_nestedObject.valueOverrides = {};
                }
                $scope.data.valueOverrides = [];

                // Convert Object into Array
                Object.keys($scope.dataset.fe_nestedObject.valueOverrides).map(function (colName) {
                    var orgValueOverrides = $scope.dataset.fe_nestedObject.valueOverrides[colName];
                    var valueOverrides = [];
                    Object.keys(orgValueOverrides).map(function (value) {
                        valueOverrides.push({ value: value, override: orgValueOverrides[value] });
                    });
                    $scope.data.valueOverrides.push({ field: colName, valueOverrides: valueOverrides });
                });

                // Additional Datasources
                $scope.additionalData = [];
                $scope.additionalDatasources.forEach(function (datasource, index) {
                    $scope.additionalData.push({});

                    if (!datasource.fe_nestedObject) {
                        datasource.fe_nestedObject = {};
                    }
                    if (!datasource.fe_nestedObject.criteria || !datasource.fe_nestedObject.criteria.fieldName) {
                        datasource.fe_nestedObject.criteria = {
                            operatorName: 'equal',
                            value: '',
                        };
                    }

                    if (!datasource.fe_nestedObject.fields) {
                        datasource.fe_nestedObject.fields = [];
                    }
                    $scope.additionalData[index].fields = datasource.fe_nestedObject.fields;

                    if (!datasource.fe_nestedObject.fieldOverrides) {
                        datasource.fe_nestedObject.fieldOverrides = {};
                    }
                    $scope.additionalData[index].fieldOverrides = [];
                    // Convert Object into Array
                    Object.keys(datasource.fe_nestedObject.fieldOverrides).map(function (colName) {
                        $scope.additionalData[index].fieldOverrides.push({
                            field: colName,
                            override: datasource.fe_nestedObject.fieldOverrides[colName],
                        });
                    });

                    if (!datasource.fe_nestedObject.valueOverrides) {
                        datasource.fe_nestedObject.valueOverrides = {};
                    }
                    $scope.additionalData[index].valueOverrides = [];

                    // Convert Object into Array
                    Object.keys(datasource.fe_nestedObject.valueOverrides).map(function (colName) {
                        var orgValueOverrides = datasource.fe_nestedObject.valueOverrides[colName];
                        var valueOverrides = [];
                        Object.keys(orgValueOverrides).map(function (value) {
                            valueOverrides.push({ value: value, override: orgValueOverrides[value] });
                        });
                        $scope.additionalData[index].valueOverrides.push({
                            field: colName, valueOverrides: valueOverrides,
                        });
                    });
                });

                if (_.get($scope, 'dialog.form')) {
                    $scope.dialog.form.$setPristine();
                }
            };

            $scope.reset();

            $scope.cancel = function () {
                $mdDialog.cancel();
            };

            $scope.addValueOverride = function (additionalIndex) {
                if (additionalIndex === undefined) {
                    $scope.data.valueOverrides.push({ field: '', valueOverrides: [{ value: '', override: '' }] });
                } else {
                    $scope.additionalData[additionalIndex].valueOverrides.push({
                        field: '', valueOverrides: [{ value: '', override: '' }],
                    });
                }
                $scope.dialog.form.$setDirty();
            };

            $scope.removeValueOverride = function (override, additionalIndex) {
                var index;

                if (additionalIndex === undefined) {
                    index = $scope.data.valueOverrides.indexOf(override);
                    if (index !== -1) {
                        $scope.data.valueOverrides.splice(index, 1);
                    }
                } else {
                    index = $scope.additionalData[additionalIndex].valueOverrides.indexOf(override);
                    if (index !== -1) {
                        $scope.additionalData[additionalIndex].valueOverrides.splice(index, 1);
                    }
                }

                $scope.dialog.form.$setDirty();
            };

            $scope.addFieldOverride = function (additionalIndex) {
                if (additionalIndex === undefined) {
                    $scope.data.fieldOverrides.push({ field: '', override: '' });
                } else {
                    $scope.additionalData[additionalIndex].fieldOverrides.push({ field: '', override: '' });
                }
                $scope.dialog.form.$setDirty();
            };

            $scope.removeFieldOverride = function (override, additionalIndex) {
                var index;

                if (additionalIndex === undefined) {
                    index = $scope.data.fieldOverrides.indexOf(override);
                    if (index !== -1) {
                        $scope.data.fieldOverrides.splice(index, 1);
                    }
                } else {
                    index = $scope.additionalData[additionalIndex].fieldOverrides.indexOf(override);
                    if (index !== -1) {
                        $scope.additionalData[additionalIndex].fieldOverrides.splice(index, 1);
                    }
                }

                $scope.dialog.form.$setDirty();
            };

            $scope.save = function () {
                // Master Dataset

                if ($scope.dataset.dirty !== 1) {
                    $scope.dataset.dirty = 2;
                }

                $scope.dataset.fe_nestedObject.fields.forEach(function (field) {

                    var fieldName = $scope.dataset.fe_nestedObject.prefix + field;

                    if ($scope.dataset.fe_excludeFields[fieldName]) {
                        delete $scope.dataset.fe_excludeFields[fieldName];
                    }
                });

                $scope.dataset.fe_nestedObject.fieldOverrides = {};
                $scope.data.fieldOverrides.map(function (elem) {
                    $scope.dataset.fe_nestedObject.fieldOverrides[elem.field] = elem.override;
                });

                $scope.dataset.fe_nestedObject.valueOverrides = {};

                $scope.data.valueOverrides.map(function (elem) {

                    var valueOverrides = {};
                    elem.valueOverrides.map(function (el) {
                        valueOverrides[el.value] = el.override;
                    });
                    $scope.dataset.fe_nestedObject.valueOverrides[elem.field] = valueOverrides;
                });

                // Additional Datasources
                $scope.additionalDatasources.forEach(function (datasource, index) {

                    if (datasource.dirty !== 1) {
                        datasource.dirty = 2;
                    }
                    datasource.fe_nestedObject.fieldOverrides = {};
                    $scope.additionalData[index].fieldOverrides.map(function (elem) {
                        datasource.fe_nestedObject.fieldOverrides[elem.field] = elem.override;
                    });

                    datasource.fe_nestedObject.valueOverrides = {};
                    datasource.fe_nestedObject.fields = $scope.additionalData[index].fields;
                    $scope.additionalData[index].valueOverrides.map(function (elem) {
                        var valueOverrides = {};
                        elem.valueOverrides.map(function (el) {
                            valueOverrides[el.value] = el.override;
                        });
                        datasource.fe_nestedObject.valueOverrides[elem.field] = valueOverrides;
                    });
                });

                $mdDialog.hide({
                    dataset: $scope.dataset,
                    additionalDatasources: $scope.additionalDatasources,
                });
            };
        }]);
