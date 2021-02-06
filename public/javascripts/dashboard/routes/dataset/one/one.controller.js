function DatasetOneCtrl($state, $scope, $rootScope, $mdDialog, Loader, AclService, DatasetService, viewUrlService,
                        dataset, additionalDatasources, $document, WIZARD_STEPS, REPROCESS_TRIGGERING_FIELDS,
                        Permissions, AuthService) {
    const datasetOneCtrl = this;
    const { datasetCtrl, dashboardCtrl } = $scope;
    const isEditRole = Permissions.isEditRole;
    const user = AuthService.currentUser();

    if (!(user._editors.includes(dataset._id.toString()) || isEditRole)) {
        return $state.go('dashboard.restricted');
    }

    if (dataset.jobId) {
        $state.go('dashboard.dataset.one.process');
    }

    this.wizardSteps = WIZARD_STEPS;
    this.verifyDatasetValidity = verifyDatasetValidity;
    this.saveContentForm = saveContentForm;
    this.closeContentForm = closeContentForm;
    this.redirectToAvailableStep = redirectToAvailableStep;
    this.setDataset = setDataset;
    this.setAdditionalDatasources = setAdditionalDatasources;
    this.isProcessing = () => $state.is('dashboard.dataset.one.process');
    this.isContentForm = () => $state.is('dashboard.dataset.one.content.create') || $state.is('dashboard.dataset.one.content.edit');

    // Current step index according to $state
    this.getCurrentStepIndex = () => _.findIndex(WIZARD_STEPS, ({ sref, active }) => $state.includes(active || sref));

    // Target step index according to dataset.firstImport (undefined if there's no target)
    this.getTargetStepIndex = () => this.dataset.firstImport ? this.dataset.firstImport - 1 : undefined;

    this.hasMainSource = () => {
        const { fileName, connection, apiEndPoint, smartsheet, pipedrive, datadotworld, salesforce } = this.dataset;

        return fileName || connection || apiEndPoint || smartsheet || pipedrive || datadotworld || salesforce;
    };

    this.isDirty = () => _.get(this.form, '$dirty', false);

    this.isUsingApi = () => _.has(this.dataset, 'apiEndPoint');

    this.isPublishAvailable = () => this.hasMainSource() && !this.isUsingApi() && this.dataset.replacement && !this.isDirty();

    this.isDiscardAvilable = () => {
        const isUsingApi = this.isUsingApi();

        return !isUsingApi || (isUsingApi && this.isDirty());
    };

    this.firstImportNeedsIncrement = () => this.getTargetStepIndex() === this.getCurrentStepIndex();

    /* Neither any changes have been made, nor firstImport needs to be incremented */
    this.hasNothingToUpdate = () => !this.isDirty() && !this.firstImportNeedsIncrement();

    /* Loading state OR pending save request OR pending async validation */
    this.isLoading = () => Loader.isLoading('dashboard.dataset.one.*') || this.pending || _.get(this.form, '$pending');

    setDataset(dataset);
    setAdditionalDatasources(additionalDatasources);

    // Check if user has permission to access wizard step
    const currentStep = datasetOneCtrl.getCurrentStepIndex();
    if (currentStep !== -1 && !isStepAccessible(WIZARD_STEPS[currentStep])) {
        redirectToAvailableStep();
    }

    this.getSortedColumns = getSortedColumns;

    this.getAllColumnNames = () => getSortedColumns().map(({ name }) => name);

    this.getVisibleColumnNames = () => this.getAllColumnNames()
        .filter(name => !this.dataset.fe_excludeFields[name]);

    this.clearErrorLog = () => {
        this.dataset.lastImportErrorLog = null;
        DatasetService.save(this.dataset);
    };

    this.view = () => {
        const view = AclService.can('dataset', 'seeStandardViews') ? this.dataset.fe_views.default_view : null;
        viewUrlService.openViewUrl($scope.subdomain, this.dataset, view);
    };

    this.revert = () => {
        this.dataset = _.cloneDeep(this.originalDataset);
        this.additionalDatasources = _.cloneDeep(this.originalAdditionalDatasources);
        this.form.$setPristine();
    };

    this.prepareSaveEntity = () =>
        _.pickBy(this.dataset, (value, key) => key === '_id' || !_.isEqual(value, this.originalDataset[key]));

    this.next = () => $state.go(WIZARD_STEPS[getNextStep() - 1].sref);

    this.save = (checkForReprocessing = true) => {
        if (this.isContentForm()) {
            return saveContentForm();
        }

        if (checkForReprocessing) {
            const warningDialog = displayReprocessWarning();
            if (warningDialog) {
                return warningDialog;
            }
        }

        this.pending = true;
        const queue = [];

        $scope.setRemindUserUnsavedChanges(false);

        const saveEntity = this.prepareSaveEntity();

        if (!_.get($state.current, 'params.noFirstImportIncrement')) {
            if (this.getTargetStepIndex() === this.getCurrentStepIndex()) {
                // jump to the next tab when it's the first import
                saveEntity.firstImport = getNextStep();
                saveEntity.tabDestination = saveEntity.firstImport;
            } else {
                // stay on the same tab in case when processing is required
                saveEntity.tabDestination = this.getCurrentStepIndex() + 1;
            }
        }

        queue.push(DatasetService.save(saveEntity));

        this.additionalDatasources.forEach((datasource, index) => {
            const saveEntity = _.pickBy(datasource, (value, key) => {
                return !this.originalAdditionalDatasources[index] ||
                    !_.isEqual(value, this.originalAdditionalDatasources[index][key]);
            });

            if (!_.isEmpty(saveEntity)) {
                saveEntity._id = datasource._id;
                queue.push(DatasetService.save(saveEntity));
            }
        });

        return Promise.all(queue)
            .then(([response = {}, ...additionalDatasourcesResponses]) => {
                setDataset(response.data.dataset);
                setAdditionalDatasources(additionalDatasourcesResponses);

                this.form.$setPristine();

                return true;
            })
            .catch(({ data = {} }) => {
                if (data.status !== 401) {
                    if (data.error) {
                        datasetCtrl.showSimpleToast(data.error);
                    } else {
                        datasetCtrl.showGenericErrorToast();
                    }
                }

                return false;
            })
            .then((success) => {
                this.pending = false;

                if (success) {
                    if (this.dataset.jobId) {
                        $state.go('dashboard.dataset.one.process');

                        return false;
                    } else {
                        datasetCtrl.showSimpleToast('Visualization updated!');
                    }
                }

                return success;
            });
    };

    this.saveAndNext = () => {
        // setTimeout is more optimal here
        // eslint-disable-next-line angular/timeout-service
        this.save().then(success => success && setTimeout(this.next));
    };

    this.isTabVisible = (step, index) => {
        const { firstImport, tabDestination, jobId } = this.originalDataset;

        if (!isStepAccessible(step)) {
            return false;
        }

        if (firstImport && tabDestination === firstImport && jobId) {
            return index < firstImport - 1;
        }

        return firstImport === 0 || index < firstImport;
    };

    this.discardReimportedChanges = (event) => {
        const { _id, title, replaced_id, child_replacement } = this.dataset;

        return $mdDialog
            .show({
                templateUrl: 'javascripts/dashboard/routes/dataset/one/discard-changes-dialog.template.html',
                parent: angular.element($document[0].body),
                targetEvent: event,
                clickOutsideToClose: true,
                controller: function ($scope, $mdDialog) {
                    $scope.title = title;
                    $scope.hide = () => $mdDialog.hide();
                    $scope.cancel = () => $mdDialog.cancel();
                },
            })
            .then(async () => {
                try {
                    const { data } = await DatasetService.replaceReimportedDataset(_id, replaced_id, child_replacement);

                    AuthService.updateUser(data.user);

                    if (replaced_id) {
                        await DatasetService.remove(_id);
                    }

                    $state.go('dashboard.dataset.one.upload', { id: replaced_id });
                    datasetCtrl.showSimpleToast('Reimport Changes Discarded.');
                } catch (e) {
                    datasetCtrl.showGenericErrorToast();
                }
            })
            .catch(datasetCtrl.showGenericErrorToast);
    };

    this.publish = () => {
        return DatasetService
            .publishNewDescription(this.dataset._id, this.dataset.replaced_id)
            .then(() => {
                datasetCtrl.showSimpleToast('Visualization Published!');

                $state.reload();
            })
            .catch(datasetCtrl.showGenericErrorToast);
    };

    $scope.$watch('datasetOneCtrl.form.$dirty', (dirty = false) => {
        $scope.setRemindUserUnsavedChanges(dirty);
    });

    $rootScope.onAfterDiscardChanges = this.revert;

    $scope.$on('$destroy', () => {
        $rootScope.onAfterDiscardChanges = angular.noop;
    });

    function setDataset(dataset) {
        datasetOneCtrl.dataset = _.defaultsDeep(dataset, {
            fe_excludeFields: _.fromPairs(getSortedColumns({ dataset }).map(({ name }) => [name, false])),
        });
        datasetOneCtrl.originalDataset = _.cloneDeep(dataset);
    }

    function setAdditionalDatasources(additionalDatasources) {
        datasetOneCtrl.additionalDatasources = additionalDatasources;
        datasetOneCtrl.originalAdditionalDatasources = _.cloneDeep(additionalDatasources);
    }

    function getSortedColumns({ dataset, additionalDatasources } = datasetOneCtrl) {
        if (!dataset.columns) {
            return [];
        }

        const customFieldsToProcess = dataset.customFieldsToProcess.map((customField, index) => {
            return {
                name: customField.fieldName,
                sample: null,
                custom: true,
                customField,
                customFieldIndex: index,
                sourceName: getSourceName(dataset),
                sourceType: 'spreadsheet',
            };
        });
        const nestedObjects = dataset.fe_nestedObject.fields.map((field) => {
            return {
                name: `${_.defaultTo(dataset.fe_nestedObject.prefix, '')}${field}`,
                sample: null,
                custom: true,
                sourceName: getSourceName(dataset),
                sourceType: 'spreadsheet',
            };
        });
        const relationshipFields = dataset.relationshipFields.map(({ field }) => {
            return {
                name: field,
                custom: true,
                sourceName: getSourceName(dataset),
                sourceType: 'spreadsheet',
            };
        });
        const additionalColumns = _.flatMap(additionalDatasources, ({ columns }) => columns);
        const columns = dataset.columns
            .concat(customFieldsToProcess)
            .concat(nestedObjects)
            .concat(relationshipFields);
        const fieldDisplayOrder = dataset.fe_fieldDisplayOrder;

        columns.sort((column1, column2) => {
            if (!fieldDisplayOrder.includes(column1.name) && fieldDisplayOrder.includes(column2.name)) {
                return 1;
            }

            if (fieldDisplayOrder.includes(column1.name) && !fieldDisplayOrder.includes(column2.name)) {
                return -1;
            }

            return fieldDisplayOrder.indexOf(column1.name) - fieldDisplayOrder.indexOf(column2.name);
        });

        return columns.concat(additionalColumns);
    }

    function displayReprocessWarning() {
        const { firstImport } = datasetOneCtrl.originalDataset;
        const dirty = _.min(
            _.filter(
                REPROCESS_TRIGGERING_FIELDS,
                (stage, path) => (
                    // Either not in initial flow or current step has been saved at least once
                    // (e.g. already went up to "Views" but returned to "Fields")
                    (!firstImport || firstImport > stage.firstImport) &&
                    // E.g. compare "fe_image.field" path across dataset and original dataset
                    !_.isEqual(_.get(datasetOneCtrl.dataset, path), _.get(datasetOneCtrl.originalDataset, path)) &&
                    // Clearing an option shouldn't reprocess the dataset
                    (!stage.nonEmpty || _.get(datasetOneCtrl.dataset, path) !== '')
                ),
            ).map(({ dirty }) => dirty),
        );

        if (dirty && datasetOneCtrl.dataset.contentEdited) {
            return $mdDialog
                .show({
                    templateUrl: 'javascripts/dashboard/routes/dataset/one/reprocess-warning-dialog.template.html',
                    parent: angular.element($document[0].body),
                    clickOutsideToClose: true,
                    fullscreen: true,
                    controller: ($scope, $mdDialog) => {
                        $scope.willRemoveEditedContent = dirty === 1;
                        $scope.title = datasetOneCtrl.dataset.title;
                        $scope.hide = () => $mdDialog.hide();
                        $scope.cancel = () => $mdDialog.cancel();
                    },
                })
                .then(() => datasetOneCtrl.save(false))
                .catch(_.noop);
        }

        return false;
    }

    function verifyDatasetValidity() {
        if (!datasetOneCtrl.form) {
            return;
        }

        if (_.isEqual(datasetOneCtrl.dataset, datasetOneCtrl.originalDataset) && _.isEqual(datasetOneCtrl.additionalDatasources, datasetOneCtrl.originalAdditionalDatasources)) {
            datasetOneCtrl.form.$setPristine();
        } else {
            datasetOneCtrl.form.$setDirty();
        }
    }

    /**
     * Returns next accessible step number where first step is 1. Returns 0 in case of no access to any step.
     * @param {Number} currentStep
     * @param {Boolean} firstRun
     * @returns {Number}
     */
    function getNextStep(currentStep = datasetOneCtrl.getCurrentStepIndex(), firstRun = true) {
        for (let i = currentStep + 1; i < WIZARD_STEPS.length; i++) {
            if (isStepAccessible(WIZARD_STEPS[i])) {
                return i + 1;
            }
        }

        // Prevent loop when the user has no access to any step
        return firstRun ? getNextStep(-1, false) : 0;
    }

    function isStepAccessible({ restrict, skipOnFirstImport }) {
        if (skipOnFirstImport && datasetOneCtrl.originalDataset.firstImport) {
            return false;
        }

        return !restrict || dashboardCtrl.can('dataset', restrict);
    }

    function saveContentForm() {
        $scope.$broadcast('contentSaveForm');
        closeContentForm();
    }

    function closeContentForm() {
        datasetOneCtrl.form.$setPristine();
    }

    function redirectToAvailableStep() {
        const { firstImport, tabDestination, dirty, _id } = datasetOneCtrl.dataset;

        if (dirty) {
            $state.go('dashboard.dataset.one.process', { id: _id });
            return;
        }

        let stepIndex = (tabDestination || firstImport || WIZARD_STEPS.length) - 1;

        if (!isStepAccessible(WIZARD_STEPS[stepIndex])) {
            stepIndex = getNextStep(stepIndex) - 1;
        }

        if (stepIndex === -1) {
            $state.go('dashboard.dataset.list');
            return;
        }

        $state.go(_.get(WIZARD_STEPS, [stepIndex, 'sref']));
    }

    function getSourceName(dataset) {
        return _.get(dataset.smartsheet, 'name') || _.get(dataset.datadotworld, 'id') || dataset.fileName || dataset.apiEndPoint || dataset.pipedrive;
    }
}

angular
    .module('arraysApp')
    .controller('DatasetOneCtrl', DatasetOneCtrl);
