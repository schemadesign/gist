angular.module('arraysApp')
    .controller('JoinDialogCtrl', function ($scope, $mdDialog, DatasetService, AuthService, dataset, $filter) {

        $scope.data = {};
        $scope.data.columns = [];
        $scope.selectedColumns = [];
        $scope.dataset = angular.copy(dataset);

        $scope.columnsAvailable = $scope.dataset.columns.concat(dataset.customFieldsToProcess.map(function (customField) {
            return { name: customField.fieldName };
        }));

        if (!$scope.dataset.relationshipFields) {
            $scope.dataset.relationshipFields = [];
        }

        DatasetService.getAvailableMatchFns()
            .then(function (availableMatchFns) {
                $scope.availableMatchFns = availableMatchFns;
            })
            .catch(function (error) {
                // console.error(error);
            });

        var user = AuthService.currentUser();
        if (user.role == 'superAdmin' || user.role == 'admin') {
            DatasetService.getDatasetsWithQuery({
                _team: user.defaultLoginTeam._id, $or: [{ replaced: false }, { replaced: { $exists: false } }],
            })
                .then(initializeDatasets)
                .catch(function (error) {
                    // console.error(error);
                });
        } else if (user.role == 'editor') {
            DatasetService.getDatasetsWithQuery({
                _id: { $in: user._editors }, _team: user.defaultLoginTeam._id,
                $or: [{ replaced: false }, { replaced: { $exists: false } }],
            })
                .then(initializeDatasets)
                .catch(function (error) {
                    // console.error(error);
                });
        } else {
            $scope.datasets = [];
            $scope.data.foreignDataset = [];
        }

        function initializeDatasets(datasets) {
            if (!datasets) {
                return;
            }
            $scope.datasets = datasets.filter(function (source) {
                return source._id != dataset._id;
            });
            $scope.data.foreignDataset = $scope.dataset.relationshipFields.map(function (relationshipField) {
                return $scope.datasets.find(function (source) {
                    return source._id == relationshipField.by.joinDataset;
                });
            });

            $scope.dataset.relationshipFields.forEach(function (relationshipField, index) {

                DatasetService.getMappingDatasourceCols(relationshipField.by.joinDataset)
                    .then(function (response) {

                        if (response.status == 200) {
                            $scope.data.columns[index] = response.data.cols;

                        }
                    });
            });
        }

        $scope.reset = function () {
            $scope.dataset = angular.copy(dataset);
            initializeDatasets();

            if (_.get($scope, 'dialog.form')) {
                $scope.dialog.form.$setPristine();
            }
        };

        $scope.verifyValidFieldName = function (fieldName, index) {
            var unique = true;
            var valid = true;
            var i = 0;
            $scope.dataset.relationshipFields.forEach(function (relationshipField) {
                if (fieldName == relationshipField.field && i != index) {
                    unique = false;
                }
                i++;
            });

            if ($filter('dotless')(fieldName) != fieldName) {
                valid = false;
            }

            $scope.dialog.form['field_' + index].$setValidity('unique', unique);
            $scope.dialog.form['field_' + index].$setValidity('valid', valid);
        };

        $scope.removeJoin = function (index) {

            var fieldName = $scope.dataset.relationshipFields[index].field;
            if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames) {
                delete $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName];
            }
            $scope.dataset.relationshipFields.splice(index, 1);
            $scope.dialog.form.$setDirty();
        };

        $scope.loadColumnsForDataset = function (index) {
            var source = $scope.data.foreignDataset[index];

            DatasetService.getMappingDatasourceCols(source._id)
                .then(function (response) {
                    if (response.status == 200) {
                        $scope.data.columns[index] = response.data.cols;

                    }
                });
        };

        $scope.addJoin = function () {
            if ($scope.dataset.dirty !== 1) {
                $scope.dataset.dirty = 2;
            }
            $scope.dataset.relationshipFields.push({
                field: '',
                singular: true,
                relationship: false,
                by: {
                    operation: 'Join',
                },
            });
            $scope.dialog.form.$setDirty();
        };

        //begin checkbox logic for showFields
        $scope.toggle = function (item, fieldName) {
            $scope.dialog.form.$setDirty();
            if (!$scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames) {
                $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames = {};
            }
            if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName] == undefined) {
                $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName] = {};
            }

            if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField == undefined) {
                $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField = [];
            }

            var i = $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField.indexOf(item);
            if (i > -1) {
                $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField.splice(i, 1);
            } else {
                $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField.push(item);
            }
        };

        $scope.isChecked = function (fieldName, datasetColumns) {

            if (datasetColumns == undefined || $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames == undefined) {
                return false;
            }
            if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName] == undefined) {
                $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName] = {};
            }

            if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField == undefined) {
                $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField = [];
            }
            if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField.length > 0) {

                return $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField.length == datasetColumns.length;
            }
        };

        $scope.toggleAll = function (fieldName, datasetColumns) {
            $scope.dialog.form.$setDirty();

            if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames == undefined) {
                $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames = {};
            }
            if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName] == undefined) {
                $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName] = {};
            }

            if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField == undefined) {
                $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField = [];
            }

            if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField.length == datasetColumns.length) {
                $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField = [];
            } else if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField.length == 0 ||
                $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField.length > 0) {

                $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField = [];

                for (var i = 0; i < datasetColumns.length; i++) {
                    $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField.push(datasetColumns[i].name);
                }
            }
        };

        $scope.deleteFeObjectShow = function (fieldName) {

            if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames &&
                $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName]) {

                delete $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName];
            }
        };

        $scope.cancel = function () {
            $mdDialog.cancel();
        };

        $scope.save = function () {

            if ($scope.dataset.dirty !== 1) {
                $scope.dataset.dirty = 2;
            }

            $scope.dataset._otherSources = [];

            $scope.data.foreignDataset.forEach(function (source, index) {

                if ($scope.dataset.relationshipFields[index] !== undefined) {
                    $scope.dataset.relationshipFields[index].by.joinDataset = source._id;
                    var field_name = $scope.dataset.relationshipFields[index].field;

                    if ($scope.dataset._otherSources.indexOf(source._id) == -1) {
                        $scope.dataset._otherSources.push(source._id);
                    }

                }
            });
            $mdDialog.hide($scope.dataset);
        };
    });
