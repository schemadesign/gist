function DatasetDataCtrl($scope, $rootScope, modalService, AclService, DatasetService, Content, DATA_TYPES) {
    const datasetDataCtrl = this;
    const { datasetOneCtrl, datasetCtrl } = $scope;

    // Const to use for limiting the length of sample data & data titles
    datasetDataCtrl.maxSampleDataLength = 30;
    datasetDataCtrl.canEditFields = AclService.can('dataset', 'editFields');
    datasetDataCtrl.fieldSortableOptions = getFieldSortableOptions();
    datasetDataCtrl.excludeAll = !_.some(datasetOneCtrl.dataset.fe_excludeFields);
    datasetDataCtrl.openFieldDialog = openFieldDialog;
    datasetDataCtrl.openNestedDialog = openNestedDialog;
    datasetDataCtrl.changeSourceNameFilter = changeSourceNameFilter;
    datasetDataCtrl.openJoinDialog = openJoinDialog;
    datasetDataCtrl.toggleExclude = toggleExclude;
    datasetDataCtrl.validateExclusion = validateExclusion;
    datasetDataCtrl.addField = addField;
    datasetDataCtrl.createdField = {
        name: '',
        dataType: 'Text',
    };

    changeSourceNameFilter(datasetOneCtrl.dataset);

    function openFieldDialog(fieldName, firstRecord, custom, customFieldIndex) {
        const data = {
            fieldName,
            firstRecord,
            custom,
            dataset: datasetOneCtrl.dataset,
            customFieldIndex,
            user: $scope.user,
        };

        let childDataset = false;
        if ((datasetOneCtrl.dataset.fileName && datasetDataCtrl.fieldFilter.sourceName !== datasetOneCtrl.dataset.fileName) ||
            (datasetOneCtrl.dataset.connection && datasetDataCtrl.fieldFilter.sourceName !== datasetOneCtrl.dataset.connection.url)) {
            [data.dataset] = datasetOneCtrl.additionalDatasources;
            childDataset = true;
        }

        modalService.openDialog('field', data)
            .then(({ dataset, instantSave, error }) => {
                if (error) {
                    datasetCtrl.showSimpleToast(error);
                    return;
                }

                if (childDataset) {
                    datasetOneCtrl.additionalDatasources[0] = dataset;
                } else {
                    datasetOneCtrl.dataset = dataset;
                }

                resetFields();
                datasetOneCtrl.verifyDatasetValidity();

                if (instantSave) {
                    datasetOneCtrl.originalDataset = datasetOneCtrl.dataset;
                    datasetOneCtrl.saveContentForm();
                }
            })
            .catch((newFieldName) => {
                if (!newFieldName) {
                    return;
                }
                const customObj = {
                    userDelimitedField: newFieldName,
                };
                openFieldDialog(`${newFieldName} Delimited`, null, customObj, datasetOneCtrl.dataset.customFieldsToProcess.length);
            });
    }

    function openNestedDialog() {
        const data = {
            dataset: datasetOneCtrl.dataset,
            additionalDatasources: datasetOneCtrl.additionalDatasources,
        };

        modalService.openDialog('nested', data)
            .then(({ dataset, additionalDatasources }) => {
                datasetOneCtrl.dataset = dataset;
                datasetOneCtrl.additionalDatasources = additionalDatasources;

                resetFields();
                datasetOneCtrl.verifyDatasetValidity();
            })
            .catch(_.noop);
    }

    function changeSourceNameFilter({ fileName, connection, apiEndPoint, smartsheet, pipedrive, datadotworld, salesforce, raw_rowObjects_coercionScheme }) {
        if (fileName) {
            datasetDataCtrl.fieldFilter = {
                sourceName: fileName,
                sourceType: 'spreadsheet',
                sourceDisplay: fileName,
            };
        } else if (connection) {
            datasetDataCtrl.fieldFilter = {
                sourceName: connection.url,
                sourceType: 'database',
                sourceDisplay: connection.tableName,
            };
        } else if (apiEndPoint) {
            datasetDataCtrl.fieldFilter = {
                sourceName: apiEndPoint,
                sourceType: 'spreadsheet',
                sourceDisplay: apiEndPoint,
            };
        } else if (smartsheet) {
            datasetDataCtrl.fieldFilter = {
                sourceName: smartsheet.name,
                sourceType: 'spreadsheet',
                sourceDisplay: smartsheet.name,
            };
        } else if (pipedrive) {
            datasetDataCtrl.fieldFilter = {
                sourceName: pipedrive,
                sourceType: 'spreadsheet',
                sourceDisplay: pipedrive,
            };
        } else if (datadotworld) {
            datasetDataCtrl.fieldFilter = {
                sourceName: datadotworld.id,
                sourceType: 'spreadsheet',
                sourceDisplay: datadotworld.id,
            };
        } else if (salesforce) {
            datasetDataCtrl.fieldFilter = {
                sourceName: salesforce.name,
                sourceType: 'spreadsheet',
                sourceDisplay: salesforce.name,
            };
        }
        datasetDataCtrl.coercionScheme = raw_rowObjects_coercionScheme;
        resetFields();
    }

    function resetFields() {
        datasetDataCtrl.fields = datasetOneCtrl.getSortedColumns();
        datasetDataCtrl.filteredFields = datasetDataCtrl.fields.filter(({ sourceName, sourceType, createdField }) => {
            return (sourceName === datasetDataCtrl.fieldFilter.sourceName && sourceType === datasetDataCtrl.fieldFilter.sourceType) || createdField;
        });

        datasetOneCtrl.dataset.fe_fieldDisplayOrder = datasetDataCtrl.fields.map(({ name }) => name);
    }

    function openJoinDialog() {
        const data = {
            dataset: datasetOneCtrl.dataset,
        };

        modalService.openDialog('join', data)
            .then((savedDataset) => {
                datasetOneCtrl.dataset = savedDataset;

                resetFields();
                datasetOneCtrl.verifyDatasetValidity();
            })
            .catch(_.noop);
    }

    function toggleExclude() {
        datasetDataCtrl.fields.forEach(({ name }) => {
            datasetOneCtrl.dataset.fe_excludeFields[name] = datasetDataCtrl.excludeAll;
        });

        datasetOneCtrl.verifyDatasetValidity();

        datasetDataCtrl.excludeAll = !datasetDataCtrl.excludeAll;
    }

    function getFieldSortableOptions() {
        return {
            stop() {
                datasetOneCtrl.dataset.fe_fieldDisplayOrder = datasetDataCtrl.filteredFields.map(({ name }) => name);

                datasetOneCtrl.verifyDatasetValidity();
            },
            disabled: datasetOneCtrl.dataset.connection || !datasetDataCtrl.canEditFields,
        };
    }

    function validateExclusion(event, fieldName) {
        event.preventDefault();
        event.stopPropagation();

        const isDirty = datasetOneCtrl.isDirty();

        if (datasetOneCtrl.dataset.fe_excludeFields[fieldName]) {
            return false;
        }

        const id = datasetOneCtrl.dataset._id;

        return DatasetService.canExcludeField(id, encodeURIComponent(fieldName))
            .then(() => {
                datasetOneCtrl.dataset.fe_excludeFields[fieldName] = true;
                $rootScope._remindUserUnsavedChanges = true;
            })
            .catch(({ data: { error } }) => {
                if (!isDirty) {
                    datasetOneCtrl.form.$setPristine();
                }

                datasetCtrl.showSimpleToast(error);
                $rootScope._remindUserUnsavedChanges = false;

                datasetOneCtrl.dataset.fe_excludeFields[fieldName] = false;
            });
    }


    async function addField() {
        try {
            const data = {
                name: '',
                dataType: 'Text',
                dataTypes: DATA_TYPES,
            };

            const isFieldStep = datasetOneCtrl.dataset.firstImport === 2;
            const { name, dataType } = await modalService.openDialog('newField', data);
            const response = await Content
                .createField({
                    datasetId: datasetOneCtrl.dataset._id,
                    name,
                }, { dataType, isFieldStep })
                .$promise;

            _.merge(datasetOneCtrl.dataset, response);
            datasetOneCtrl.originalDataset = datasetOneCtrl.dataset;

            if (isFieldStep) {
                const temporaryItem = {
                    name,
                    dataType,
                    operation: window.arrays.getOperation(dataType),
                    sample: '',
                    createdField: true,
                };

                datasetOneCtrl.dataset.columns.push(temporaryItem);
            }

            resetFields();

            datasetCtrl.showSimpleToast('Added field');
        } catch (e) {
            const error = _.get(e, 'data.error');

            if (error) {
                datasetCtrl.showSimpleToast(error);
            }
        }
    }
}

angular
    .module('arraysApp')
    .controller('DatasetDataCtrl', DatasetDataCtrl);
