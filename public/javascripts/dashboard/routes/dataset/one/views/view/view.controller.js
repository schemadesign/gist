function ViewCtrl($scope, $mdDialog, $state, user, view, viewUrlService, $mdUtil, DatasetService, modalService) {
    const { datasetCtrl, datasetOneCtrl, datasetViewsCtrl } = $scope;
    const viewCtrl = this;

    const CUSTOM_COLUMN_NUMBER_OF_ITEMS = 'Number of Items';
    const CUSTOM_COLUMN_DISABLED = 'None';
    const LEGACY_COLUMN_DISABLED_NAME = 'Disabled';

    const updatingDurationsValues = item => (item === LEGACY_COLUMN_DISABLED_NAME ? CUSTOM_COLUMN_DISABLED : item);

    const $previewFrame = $('#previewFrame');
    const specialSelectFrom = ['defaultAxis', 'duration', 'range', 'unit'];

    viewCtrl.dataset = _.cloneDeep(datasetOneCtrl.dataset);
    viewCtrl.viewName = view.name;
    viewCtrl.viewDisplayName = view.displayAs;
    viewCtrl.data = _.cloneDeep(_.get(datasetOneCtrl.dataset.fe_views, ['views', viewCtrl.viewName], {}));
    viewCtrl.viewTabs = user.role === 'superAdmin' ? view.tabs : view.tabs.filter(tab => tab !== 'Advanced');
    viewCtrl.viewLookup = view.lookup;
    viewCtrl.availableForUnit = ['%'];
    viewCtrl.availableForDefaultAxis = ['X Axis', 'Y Axis'];
    viewCtrl.defaultAxisLabels = { 'X Axis': 'X Axis', 'Y Axis': 'Y Axis' };
    viewCtrl.updatePreview = _.debounce(updatePreview, 100);
    viewCtrl.checkDependency = checkDependency;
    viewCtrl.dataTypeMatch = dataTypeMatch;
    viewCtrl.appendNumberOfItems = appendNumberOfItems;
    viewCtrl.allFieldsIncluded = allFieldsIncluded;
    viewCtrl.isFieldIncluded = isFieldIncluded;
    viewCtrl.includeExcludeAllFields = includeExcludeAllFields;
    viewCtrl.includeExcludeField = includeExcludeField;
    viewCtrl.setDefaultSetting = setDefaultSetting;
    viewCtrl.filterSettings = filterSettings;
    viewCtrl.excludeBy = excludeBy;
    viewCtrl.hide = hide;
    viewCtrl.cancel = cancel;

    const { durationsAvailableForGroupBy = [] } = viewCtrl.data;

    if (durationsAvailableForGroupBy.length) {
        viewCtrl.data.durationsAvailableForGroupBy = durationsAvailableForGroupBy.map(updatingDurationsValues);
    }

    datasetViewsCtrl.scaffoldView(viewCtrl.data, view, true);
    datasetViewsCtrl.previewLoaded = false;

    const DISABLING_TOUCH_CLASS = 'disable-scrolling-touch';

    const addDisablingClass = () => $('body').addClass(DISABLING_TOUCH_CLASS);
    const removeDisablingClass = () => $('body').removeClass(DISABLING_TOUCH_CLASS);

    activate();

    function activate() {
        updatePreview();
        setSettings();

        $scope.$watch(
            'viewCtrl.data',
            (newVal, oldVal) => {
                if (!_.isEqual(newVal, oldVal)) {
                    setSettings();
                    // Execute debounced function
                    viewCtrl.updatePreview();
                }
            },
            true
        );

        $scope.$watch('viewCtrl.menuViewSettings', menuViewSettings => {
            if (menuViewSettings.length && !menuViewSettings.some(({ name }) => viewCtrl.currentMenuName === name)) {
                viewCtrl.currentMenuName = menuViewSettings[0].name;
            }
        });

        addDisablingClass();

        $scope.$on('$destroy', $mdUtil.disableScrollAround());
        $previewFrame.on('remove', () => {
            removeDisablingClass();
        });

        $previewFrame.one('load', () => {
            if (!datasetViewsCtrl.previewLoaded) {
                datasetViewsCtrl.previewLoaded = true;
                $scope.$digest();
            }
        });

        // Set default exclude fields based on data type restrictions
        view.settings.forEach(({ restrictColumnDataType, selectExcludeBy }) => {
            if (restrictColumnDataType && selectExcludeBy && _.isUndefined(viewCtrl.data[selectExcludeBy])) {
                const dataTypeFilter = dataTypeMatch(restrictColumnDataType);
                const colsAvailableOfType = datasetViewsCtrl.colsAvailable.filter(dataTypeFilter);

                // Invert selection of available fields of type against all fields
                const defaultExcludeFields = datasetViewsCtrl.colsAll.filter(
                    column => !colsAvailableOfType.includes(column)
                );

                // Set default exclude fields
                viewCtrl.data[selectExcludeBy] = defaultExcludeFields;
            }
        });
    }

    function updatePreview() {
        _.set(viewCtrl.dataset.fe_views, ['views', viewCtrl.viewName], _.cloneDeep(viewCtrl.data));

        return DatasetService.draft(viewCtrl.dataset)
            .then(updateIframe)
            .catch(({ data = {} }) => {
                // Redirect back to the views when draft couldn't be created on first visit
                if (!datasetViewsCtrl.previewLoaded) {
                    $state.go('dashboard.dataset.one.views');
                }

                datasetCtrl.showSimpleToast(data.error);
            });
    }

    function updateIframe() {
        const viewUrl = viewUrlService.getViewUrl($scope.subdomain, viewCtrl.dataset, viewCtrl.viewName, true);

        $previewFrame.attr('src', viewUrl);
    }

    function findDependency(settingName) {
        const wantedSetting = viewCtrl.viewSettings.find(({ name }) => name === settingName);

        if (!wantedSetting) {
            return null;
        }

        return { name: settingName, display: wantedSetting.displayAs };
    }

    function checkDependency(selectFrom) {
        if (specialSelectFrom.includes(selectFrom)) {
            return null;
        }

        return findDependency(selectFrom);
    }

    function filterViewSettings(viewSettings) {
        const columns = _.get(viewCtrl, ['dataset', 'columns'], {});
        const hasPercentField = _.findIndex(columns, ({ operation }) => operation === 'ToPercent') !== -1;
        const unitsFilter = name => (name === 'units' ? hasPercentField : true);

        const ignoredType = viewCtrl.data.simpleChart ? 'stacked' : 'simple';
        const includes = (collection, item) =>
            _.isArray(collection) ? collection.includes(item) : _.eq(collection, item);
        const matchesCondition = (conditions, conditionsType) => {
            if (!conditions) {
                return true;
            }

            if (!_.isArray(conditions)) {
                conditions = [conditions];
            }

            const conditionCheck = ({ type, name, value, minLength }) => {
                const selectedColumn = viewCtrl.data[name] || false;

                if (type !== 'setting') {
                    return false;
                }

                if (minLength) {
                    return selectedColumn.length >= minLength;
                }

                return includes(value, selectedColumn);
            };

            const conditionFunction = condition => {
                if (!_.isArray(condition)) {
                    condition = [condition];
                }

                return condition.every(conditionCheck);
            };

            return conditionsType === 'some' ? conditions.some(conditionFunction) : conditions.every(conditionFunction);
        };

        return viewSettings.filter(
            ({ type, condition, conditions, conditionsType, name }) =>
                type !== ignoredType && matchesCondition(conditions || condition, conditionsType) && unitsFilter(name)
        );
    }

    function filterMenuSettings(viewSettings) {
        return viewSettings.filter(({ inputType, tab }) => inputType === 'menu' && tab === 'Controls');
    }

    function filterCheckboxSettings(viewSettings) {
        return viewSettings.filter(({ inputType, tab }) => inputType === 'checkbox');
    }

    function dataTypeMatch(requireType) {
        function returnDataTypeMatch(column) {
            if (_.isUndefined(requireType)) {
                return true;
            }

            if (_.get(viewCtrl.dataset.raw_rowObjects_coercionScheme, [column, 'operation'])) {
                const operation = viewCtrl.dataset.raw_rowObjects_coercionScheme[column].operation.toLowerCase();
                if (Array.isArray(requireType)) {
                    return requireTypeArray(operation);
                }

                return operation.includes(requireType.toLowerCase());
            }

            return customFieldCheck(column);
        }

        function requireTypeArray(operation) {
            return requireType.some(type => operation.includes(type.toLowerCase()));
        }

        /**
         * Finds the custom field's parent field, and then calls returnDataTypeMatch
         *  with the parent's field name to see if the customField has the requiredType.
         * @param {string} col - Custom column to check against it's parent column
         */
        function customFieldCheck(col) {
            return viewCtrl.dataset.customFieldsToProcess.some(
                customField =>
                    col === customField.fieldName &&
                    customField.fieldsToMergeIntoArray.some(fieldName => returnDataTypeMatch(fieldName))
            );
        }

        return returnDataTypeMatch;
    }

    function appendNumberOfItems(menu, cols) {
        if (['Aggregate By', 'Y Axis', 'Bars', 'Bubble Size'].includes(menu)) {
            return [...cols, CUSTOM_COLUMN_NUMBER_OF_ITEMS];
        }

        return cols;
    }

    function setSettings() {
        viewCtrl.viewSettings = filterViewSettings(view.settings);
        viewCtrl.menuViewSettings = filterMenuSettings(viewCtrl.viewSettings, viewCtrl);
        viewCtrl.checkboxSettings = filterCheckboxSettings(viewCtrl.viewSettings, viewCtrl);

        viewCtrl.orientationDisplayAsOverrides = {};
        if (viewCtrl.data.orientation) {
            const orientationOptions = _.get(_.find(viewCtrl.viewSettings, { name: 'orientation' }), 'options');
            viewCtrl.orientationDisplayAsOverrides = _.get(
                _.find(orientationOptions, { value: viewCtrl.data.orientation }),
                'displayAsOverrides'
            );

            if (viewCtrl.data.orientation === 'horizontal') {
                viewCtrl.availableForDefaultAxis = ['Y Axis', 'X Axis'];
                viewCtrl.defaultAxisLabels = { 'X Axis': 'Y Axis', 'Y Axis': 'X Axis' };
            } else {
                viewCtrl.availableForDefaultAxis = ['X Axis', 'Y Axis'];
                viewCtrl.defaultAxisLabels = { 'X Axis': 'X Axis', 'Y Axis': 'Y Axis' };
            }
        }

        const getFields = settings =>
            _.reduce(
                settings,
                (accumulator, setting) => {
                    const { restrictColumnDataType, name, displayAs, selectFrom, ranges, durations = [] } = setting;

                    const dataTypeFilter = dataTypeMatch(restrictColumnDataType);
                    const equals = a => b => _.eq(a, b);
                    const columns = appendNumberOfItems(
                        displayAs,
                        datasetViewsCtrl.colsAvailable.filter(dataTypeFilter)
                    );
                    const updatedDurations = durations.map(updatingDurationsValues);

                    const getSettings = _.cond([
                        [equals('column'), _.constant(columns)],
                        [equals('duration'), _.constant(updatedDurations)],
                        [equals('range'), _.constant(ranges)],
                        [equals('defaultAxis'), _.constant(viewCtrl.availableForDefaultAxis)],
                        [equals('unit'), _.constant(viewCtrl.availableForUnit)],
                    ]);
                    const settings = getSettings(selectFrom);

                    if (settings) {
                        accumulator[name] = settings;
                    }

                    return accumulator;
                },
                {}
            );

        viewCtrl.availableFields = getFields(viewCtrl.menuViewSettings);
        viewCtrl.availableCheckboxFields = getFields(viewCtrl.checkboxSettings);
    }

    function getIsDate() {
        const groupBy =
            _.get(viewCtrl, ['data', 'defaultChartByColumnName']) ||
            _.get(viewCtrl, ['data', 'defaultGroupByColumnName']);

        const field = _.get(viewCtrl, ['dataset', 'raw_rowObjects_coercionScheme', groupBy], {});

        return field.operation === 'ToDate' && !viewCtrl.data.simpleChart;
    }

    function filterSettings({ name }) {
        if (name === 'defaultSegmentByDuration') {
            return getIsDate();
        }

        return true;
    }

    function allFieldsIncluded(selectBy, name, selectFrom) {
        if (specialSelectFrom.includes(selectFrom)) {
            return viewCtrl.data[selectBy].length === viewCtrl.availableFields[name].length;
        }

        return viewCtrl.data[selectBy].length === 0;
    }

    function isFieldIncluded(selectBy, name, selectFrom) {
        const excludedFields = _.get(viewCtrl, `data.${selectBy}`, []);
        if (specialSelectFrom.includes(selectFrom)) {
            return excludedFields.includes(name);
        }

        return !excludedFields.includes(name);
    }

    function includeExcludeAllFields(selectBy, name, selectFrom) {
        const include = allFieldsIncluded(selectBy, name, selectFrom);
        const availableFields = viewCtrl.availableFields[name];

        availableFields.forEach(field => {
            includeExcludeField(field, selectBy, selectFrom, viewCtrl.data[name] === field, include);
        });

        // Remove invalid columns
        viewCtrl.data[selectBy] = viewCtrl.data[selectBy].filter(field => availableFields.includes(field));
    }

    function includeExcludeField(column, selectBy, selectFrom, isDefault, includeColumn) {
        if (isDefault) {
            return;
        }

        const array = _.get(viewCtrl, `data.${selectBy}`, []);

        if (specialSelectFrom.includes(selectFrom)) {
            if (array.includes(column) && includeColumn !== false) {
                _.pull(array, column);
            } else if (!includeColumn) {
                array.push(column);
            }
            return;
        }

        if (!array.includes(column) && includeColumn !== false) {
            array.push(column);
        } else if (!includeColumn) {
            _.pull(array, column);
        }
    }

    function setDefaultSetting(selectBy, name, selectFrom, value) {
        const isInclusiveList = specialSelectFrom.includes(selectFrom);

        if (isInclusiveList && !viewCtrl.data[selectBy].includes(value)) {
            viewCtrl.data[selectBy].push(value);
        } else if (!isInclusiveList) {
            _.pull(viewCtrl.data[selectBy], value);
        }

        viewCtrl.data[name] = value;
    }

    function excludeBy(selectExcludeBy) {
        const excludeValueArray = viewCtrl.data[selectExcludeBy];

        if (_.isEmpty(excludeValueArray)) {
            return _.constant(true);
        }

        return input => !excludeValueArray.includes(input);
    }

    function hide() {
        if (!_.isEqual(viewCtrl.data, _.get(datasetOneCtrl.dataset.fe_views, ['views', viewCtrl.viewName], {}))) {
            _.set(datasetOneCtrl.dataset.fe_views, ['views', viewCtrl.viewName], viewCtrl.data);
            datasetOneCtrl.form.$setDirty();
        }

        $state.go('dashboard.dataset.one.views');
    }

    function cancel() {
        if (!_.isEqual(viewCtrl.data, _.get(datasetOneCtrl.dataset.fe_views, ['views', viewCtrl.viewName], {}))) {
            removeDisablingClass();

            return $mdDialog
                .show(
                    modalService.openConfirmModal(
                        'Your visualization has unsaved changes',
                        `Are you sure want to discard changes made to ${viewCtrl.viewDisplayName}?`,
                        'Continue editing',
                        'Discard changes'
                    )
                )
                .then(() => $state.go('dashboard.dataset.one.views'))
                .catch(() => {
                    addDisablingClass();
                });
        }

        return $state.go('dashboard.dataset.one.views');
    }
}

function getFilenameWithoutExt() {
    return path => {
        if (!path) {
            return '';
        }

        const fileName = path.split('/').pop();
        const dotIndex = fileName.lastIndexOf('.');

        return dotIndex === -1 ? fileName : fileName.substring(0, dotIndex);
    };
}

angular
    .module('arraysApp')
    .filter('getFilenameWithoutExt', getFilenameWithoutExt)
    .controller('ViewCtrl', ViewCtrl);
