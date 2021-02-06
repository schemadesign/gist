function FieldDialogCtrl($scope, $mdDialog, $filter, fieldName, firstRecord, dataset, custom, customFieldIndex,
                         filterOnly, user, KNOWN_DATE_FORMATS, DATA_TYPES, Content, DatasetService) {
    const originalFieldName = fieldName;

    this.KNOWN_DATE_FORMATS = KNOWN_DATE_FORMATS;

    $scope.firstRecord = firstRecord;
    $scope.custom = custom;
    $scope.customFieldIndex = customFieldIndex;
    $scope.user = user;
    $scope.originalColumn = _.find(dataset.columns, ({ name }) => name === fieldName);
    $scope.thisFieldCoercion = { input_format: '', output_format: '', currency: '' };
    $scope.updatedDataTypes = DATA_TYPES;
    $scope.removeCreatedField = removeCreatedField;

    async function removeCreatedField() {
        try {
            const name = $scope.originalColumn.name;

            await DatasetService.canExcludeField(dataset._id, encodeURIComponent(name));

            const response = await Content
                .removeField({
                    datasetId: dataset._id,
                    name,
                }, {})
                .$promise;
            const isFieldStep = dataset.firstImport === 2;

            $scope.dataset = isFieldStep ? dataset : response;

            if (isFieldStep) {
                $scope.dataset.columns = $scope.dataset.columns.filter((column) => column.name !== name);
            }

            $mdDialog.hide({ dataset: $scope.dataset, instantSave: !isFieldStep });
        } catch (e) {
            $mdDialog.hide({ error: _.get(e, 'data.error') || e });
        }
    }

    function refreshFieldByName(name) {
        // General
        if (!$scope.dataset.fe_fieldDisplayOrder) {
            $scope.dataset.fe_fieldDisplayOrder = [];
        }
        var index = $scope.dataset.fe_fieldDisplayOrder.indexOf(name);
        if (index !== -1) {
            $scope.data.displayOrder = index;
        }

        // Filter
        if (filterOnly) {
            if (!$scope.dataset.fe_filters.fieldsNotAvailable) {
                $scope.dataset.fe_filters.fieldsNotAvailable = [];
            }
            $scope.data.filterNotAvailable = $scope.dataset.fe_filters.fieldsNotAvailable.indexOf(name) !== -1;

            if (!$scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual) {
                $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual = [];
            }
            $scope.data.commaSeparatedAsIndividual = $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.indexOf(name) !== -1;
            if (!$scope.dataset.fe_filters.fieldsAsRangeSlider) {
                $scope.dataset.fe_filters.fieldsAsRangeSlider = [];
            }
            $scope.data.rangeSlider = $scope.dataset.fe_filters.fieldsAsRangeSlider.indexOf(name) !== -1;

            if (!$scope.dataset.fe_filters.fieldsMultiSelectable) {
                $scope.dataset.fe_filters.fieldsMultiSelectable = [];
            }
            $scope.data.multipleSelection = $scope.dataset.fe_filters.fieldsMultiSelectable.indexOf(name) !== -1;

            if (!$scope.dataset.fe_filters.fieldsSortableByInteger) {
                $scope.dataset.fe_filters.fieldsSortableByInteger = [];
            }
            $scope.data.sortableByInt = $scope.dataset.fe_filters.fieldsSortableByInteger.indexOf(name) !== -1;

            if (!$scope.dataset.fe_filters.fieldsSortableInReverseOrder) {
                $scope.dataset.fe_filters.fieldsSortableInReverseOrder = [];
            }
            $scope.data.sortableInReverse = $scope.dataset.fe_filters.fieldsSortableInReverseOrder.indexOf(name) !== -1;

            if (!$scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName) {
                $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName = {};
            }

            if (!$scope.dataset.fe_filters.valuesToExcludeByOriginalKey) {
                $scope.dataset.fe_filters.valuesToExcludeByOriginalKey = {};
            }
            if (!$scope.dataset.fe_filters.valuesToExcludeByOriginalKey[name] && $scope.customFieldIndex === undefined) {
                $scope.dataset.fe_filters.valuesToExcludeByOriginalKey[name] = [];
            }
            if (!$scope.dataset.fe_filters.valuesToExcludeByOriginalKey._all) {
                $scope.dataset.fe_filters.valuesToExcludeByOriginalKey._all = [];
            }

            if (!$scope.dataset.fe_filters.keywords) {
                $scope.dataset.fe_filters.keywords = [];
            }
        }

        $scope.data.keywords = _.get($scope, 'dataset.fe_filters.keywords', []).find(function (elem) {
            return elem.title === name;
        });

        if (!$scope.data.keywords) {
            $scope.data.keywords = { title: name, choices: [] };
        }

    }

    function revertFieldNameOverrideIfBlank() {
        if ($scope.dataset.fe_displayTitleOverrides && $scope.dataset.fe_displayTitleOverrides.hasOwnProperty($scope.fieldName) && $scope.dataset.fe_displayTitleOverrides[$scope.fieldName] === '') {
            delete $scope.dataset.fe_displayTitleOverrides[$scope.fieldName];
        }
        return $scope.dataset;
    }

    $scope.reset = function () {

        $scope.dataset = angular.copy(dataset);
        $scope.fieldName = fieldName;

        if ($scope.customFieldIndex !== undefined) {
            if (!dataset.customFieldsToProcess) {
                $scope.dataset.customFieldsToProcess = [];
            }
            $scope.customField = $scope.dataset.customFieldsToProcess[customFieldIndex];
            if (!$scope.customField) {
                $scope.customField = {
                    fieldName: '',
                    fieldType: 'array',
                    fieldsToMergeIntoArray: [],
                    delimiterOnFields: [],
                };
                // If we're setting up a new custom field with the passed values
                if (custom.userDelimitedField) {
                    $scope.customField.fieldsToMergeIntoArray = [custom.userDelimitedField];
                    $scope.customField.fieldName = fieldName;
                }
            }
            if (!$scope.customField.delimiterOnFields) {
                $scope.customField.delimiterOnFields = [];
            }

            $scope.fieldName = $scope.customField.fieldName;
        }

        $scope.data = {};

        refreshFieldByName($scope.fieldName);

        // Data Type Coercion

        $scope.coercionScheme = angular.copy($scope.dataset.raw_rowObjects_coercionScheme);

        // Get around issue with model in md-select losing formatting properties on load
        const scheme = $scope.dataset.raw_rowObjects_coercionScheme[$scope.fieldName];

        if (scheme) {
            $scope.thisFieldCoercion = {
                operation: scheme.operation,
                input_format: scheme.format,
                output_format: scheme.outputFormat,
                currency: scheme.currency,
            };
        }

        if (_.get($scope, 'dialog.form')) {
            $scope.dialog.form.$setPristine();
        }
    };

    $scope.reset();

    $scope.removeOneToOneOverride = function (valueByOverride) {
        var index = $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName].indexOf(valueByOverride);
        if (index !== -1) {
            $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName].splice(index, 1);
            $scope.dialog.form.$setDirty();
        }
    };

    $scope.addOneToOneOverride = function () {
        if (!$scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName]) {
            $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName] = [];
        }
        var emptyElem = $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName].find(function (elem) {
            return elem.value === '';
        });
        if (!emptyElem) {
            $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName].push({
                override: '',
                value: '',
            });
            $scope.dialog.form.$setDirty();
        }
    };

    $scope.verifyUniqueValueOverride = function (valueOverride, index) {
        var valueOverrideUnique = true,
            valueOverrideTitleUnique = true;
        $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName].forEach(function (elem) {
            if (valueOverride === elem) {
                return;
            }

            if (valueOverride.value === elem.value) {
                valueOverrideUnique = false;
            }
            if (valueOverride.override === elem.override) {
                valueOverrideTitleUnique = false;
            }
        });

        $scope.dialog.form['overrideValue_' + index].$setValidity('unique', valueOverrideUnique);
        $scope.dialog.form['overrideValueTitle_' + index].$setValidity('unique', valueOverrideTitleUnique);
    };

    /**
     * Calls cancel, but passes the field name to open a new field modal
     * to only create a delimited field.
     */
    $scope.newDelimitedField = () => {
        $mdDialog.cancel(originalFieldName);
    };

    $scope.cancel = function () {
        $mdDialog.cancel();
    };

    $scope.delete = function () {
        $scope.reset();
        if (customFieldIndex < $scope.dataset.customFieldsToProcess.length) {
            // Remove the field from customFieldsToProcess, fe_excludeFields, and the fe_exludeFieldsObjDetail
            // object
            $scope.dataset.customFieldsToProcess.splice(customFieldIndex, 1);
            delete $scope.dataset.fe_excludeFields[$scope.dialog.form.fieldName.$modelValue];
            delete $scope.dataset.fe_excludeFieldsObjDetail[$scope.dialog.form.fieldName.$modelValue];
        }
        $mdDialog.hide({ dataset: $scope.dataset });
    };

    $scope.verifyUniqueFieldName = function (name) {
        refreshFieldByName(name);

        $scope.customField.fieldName = name;

        var unique = ($scope.dataset.columns.find(function (column) {
            return name === column.name;
        }) === undefined);

        if (unique && $scope.dataset.customFieldsToProcess) {
            unique = ($scope.dataset.customFieldsToProcess.find(function (customField, index) {
                if (index === customFieldIndex) {
                    return false;
                }
                return name === customField.fieldName;
            }) === undefined);
        }

        $scope.dialog.form.fieldName.$setValidity('unique', unique);
    };

    $scope.setDirty = function (number) {
        if ($scope.dataset.dirty !== 1) {
            $scope.dataset.dirty = number;
        }
    };

    $scope.save = function () {
        // If no changes, return without saving
        if (!$scope.dialog.form.$dirty) {
            return $mdDialog.cancel();
        }

        // General
        if ($scope.customFieldIndex === undefined) {
            const coercion = _.pick($scope.thisFieldCoercion, ['operation']);
            const column = _.pick($scope.thisFieldCoercion, ['operation']);

            // Set date field formats if exist
            if (coercion.operation === 'ToDate') {
                coercion.format = $scope.thisFieldCoercion.input_format;
                coercion.outputFormat = $scope.thisFieldCoercion.output_format;
                Object.assign(column, _.pick($scope.thisFieldCoercion, ['input_format', 'output_format']));
            }

            if (coercion.operation === 'ToCurrency') {
                coercion.currency = $scope.thisFieldCoercion.currency;
                Object.assign(column, _.pick($scope.thisFieldCoercion, ['currency']));
            }

            $scope.dataset.raw_rowObjects_coercionScheme[$scope.fieldName] = coercion;

            const datasetColumn = $scope.dataset.columns.find(({ name }) => name === $scope.fieldName);

            if (datasetColumn) {
                Object.assign(datasetColumn, column);
            }

            var columnToUpdate = $scope.dataset.columns.find(column => column.name === $scope.fieldName);

            columnToUpdate.operation = coercion.operation;
            columnToUpdate.data_type = $filter('typeCoercionToString')(coercion);
        }

        if ($scope.dataset.raw_rowObjects_coercionScheme[$scope.fieldName]) {
            if ($scope.originalColumn) {
                if ($scope.originalColumn.operation === 'ToDate' &&
                    $scope.originalColumn.format !== $scope.dataset.raw_rowObjects_coercionScheme[$scope.fieldName].format) {
                    $scope.dataset.dirty = 1;
                } else if ($scope.originalColumn.operation !== $scope.dataset.raw_rowObjects_coercionScheme[$scope.fieldName].operation) {
                    $scope.dataset.dirty = 1;
                }
            } else {
                $scope.dataset.dirty = 1;
            }
        }

        if ($scope.dataset.raw_rowObjects_coercionScheme[$scope.fieldName] === 'ToInteger') {
            var floatRE = /[^0-9,]/;
            if (floatRE.test($scope.firstRecord)) {
                $scope.dataset.raw_rowObjects_coercionScheme[$scope.fieldName] = { operation: 'ToFloat' };
            }
        }

        if (!filterOnly) {
            var currentValue = $scope.dialog.form.fieldName.$modelValue;

            if (originalFieldName !== currentValue) {

                var originalExclude = $scope.dataset.fe_excludeFields[originalFieldName];
                $scope.dataset.fe_excludeFields[currentValue] = originalExclude;
                delete $scope.dataset.fe_excludeFields[originalFieldName];
            }

            // If this is a new field, then add it to fe_excludeFieldsObjDetail and fe_excludeFields
            if ($scope.dataset.fe_excludeFields[$scope.dialog.form.fieldName.$modelValue] !== true) {
                $scope.dataset.fe_excludeFieldsObjDetail[$scope.dialog.form.fieldName.$modelValue] = false;
                $scope.dataset.fe_excludeFields[$scope.dialog.form.fieldName.$modelValue] = false;
            }
        }

        var index = $scope.dataset.fe_fieldDisplayOrder.indexOf($scope.fieldName);
        if (index !== -1) {
            $scope.dataset.fe_fieldDisplayOrder.splice(index, 1);
        }
        if ($scope.data.displayOrder !== undefined) {
            $scope.dataset.fe_fieldDisplayOrder.splice($scope.data.displayOrder, 0, $scope.fieldName);
        }

        index = $scope.dataset.fe_filters.fieldsNotAvailable.indexOf(originalFieldName);
        if (index !== -1 && originalFieldName !== $scope.fieldName) {
            $scope.dataset.fe_filters.fieldsNotAvailable.splice(index, 1);
        }

        if ($scope.data.filterNotAvailable) {
            if ($scope.dataset.dirty !== 1) {
                $scope.dataset.dirty = 3; //redo filter caching
            }
            $scope.dataset.fe_filters.fieldsNotAvailable.push($scope.fieldName);
        }

        index = $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.indexOf($scope.fieldName);
        if (index !== -1) {
            $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.splice(index, 1);
        }
        if ($scope.data.commaSeparatedAsIndividual) {
            $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.push($scope.fieldName);
        }
        if ($scope.dataset.fe_filters.fieldsAsRangeSlider) {
            index = $scope.dataset.fe_filters.fieldsAsRangeSlider.indexOf($scope.fieldName);
            if (index !== -1) {
                $scope.dataset.fe_filters.fieldsAsRangeSlider.splice(index, 1);
            }
        }
        if ($scope.data.rangeSlider) {
            $scope.dataset.fe_filters.fieldsAsRangeSlider.push($scope.fieldName);
        }

        index = $scope.dataset.fe_filters.fieldsMultiSelectable.indexOf($scope.fieldName);
        if (index !== -1) {
            $scope.dataset.fe_filters.fieldsMultiSelectable.splice(index, 1);
        }
        if ($scope.data.multipleSelection) {
            $scope.dataset.fe_filters.fieldsMultiSelectable.push($scope.fieldName);
        }

        index = $scope.dataset.fe_filters.fieldsSortableByInteger.indexOf($scope.fieldName);
        if (index !== -1) {
            $scope.dataset.fe_filters.fieldsSortableByInteger.splice(index, 1);
        }

        if ($scope.data.sortableByInt) {
            $scope.dataset.fe_filters.fieldsSortableByInteger.push($scope.fieldName);
        }

        index = $scope.dataset.fe_filters.fieldsSortableInReverseOrder.indexOf($scope.fieldName);

        if (index !== -1) {
            $scope.dataset.fe_filters.fieldsSortableInReverseOrder.splice(index, 1);
        }

        if ($scope.data.sortableInReverse) {
            $scope.dataset.fe_filters.fieldsSortableInReverseOrder.push($scope.fieldName);
        }

        if (filterOnly) {
            if ($scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.fieldName]) {
                $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.fieldName] =
                    $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.fieldName].filter(function (elem) {
                        return elem.value !== '' || elem.override !== '';
                    });

                if ($scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.fieldName].length === 0) {
                    delete $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.fieldName];
                }
            }
        }

        $scope.dataset.fe_filters.keywords = $scope.dataset.fe_filters.keywords.filter(function (elem) {
            return elem.title !== $scope.fieldName;
        });

        if ($scope.data.keywords.choices.length > 0) {
            $scope.dataset.fe_filters.keywords = $scope.dataset.fe_filters.keywords.concat($scope.data.keywords);
        }

        if ($scope.customFieldIndex !== undefined) {
            if ($scope.dataset.dirty !== 1) {
                $scope.dataset.dirty = 2;
            }
            $scope.dataset.customFieldsToProcess.splice(customFieldIndex, 1, $scope.customField);
        }

        // fe_displayTitleOverride
        $scope.dataset = revertFieldNameOverrideIfBlank();

        $mdDialog.hide({ dataset: $scope.dataset });
    };

}

angular.module('arraysApp')
    .controller('FieldDialogCtrl', FieldDialogCtrl);
