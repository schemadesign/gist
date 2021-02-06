function DatasetFiltersCtrl($scope, modalService) {
    const datasetFiltersCtrl = this;
    const { datasetOneCtrl } = $scope;
    const { dataset: { fe_filters } } = datasetOneCtrl;
    const reservedNames = ['Has Title', 'Has Image'];

    // Length limit of sample data & data titles
    datasetFiltersCtrl.maxSampleDataLength = 30;

    datasetFiltersCtrl.colsAvailable = datasetOneCtrl.getVisibleColumnNames();
    datasetFiltersCtrl.excludeAll = _.isNil(fe_filters.fieldsNotAvailable) || !_.isEmpty(fe_filters.fieldsNotAvailable);
    datasetFiltersCtrl.fabricatedFilters = getFabricatedFilters();
    datasetFiltersCtrl.defaultFilters = getDefaultFilters();
    datasetFiltersCtrl.toggleFilter = toggleFilter;
    datasetFiltersCtrl.editFilter = editFilter;
    datasetFiltersCtrl.addDefaultFilter = addDefaultFilter;
    datasetFiltersCtrl.removeDefaultFilter = removeDefaultFilter;
    datasetFiltersCtrl.verifyUniqueDefaultFilter = verifyUniqueDefaultFilter;
    datasetFiltersCtrl.addFabricated = addFabricated;
    datasetFiltersCtrl.removeFabricated = removeFabricated;
    datasetFiltersCtrl.getFabricatedChoices = getFabricatedChoices;
    datasetFiltersCtrl.verifyUniqueFabricated = verifyUniqueFabricated;
    datasetFiltersCtrl.toggleExcludeAll = toggleExcludeAll;

    $scope.$watch('datasetFiltersCtrl.fabricatedFilters', updateFabricatedFilters, true);
    $scope.$watch('datasetFiltersCtrl.defaultFilters', updateDefaultFilters, true);

    // update controller data on form reset
    $scope.$watch('datasetOneCtrl.dataset', () => {
        datasetFiltersCtrl.fabricatedFilters = getFabricatedFilters();
        datasetFiltersCtrl.defaultFilters = getDefaultFilters();
    });

    resetFields();

    function resetFields() {
        datasetFiltersCtrl.fields = datasetOneCtrl.getSortedColumns();
    }

    function getFabricatedFilters() {
        const fabricatedFilters = _.cloneDeep(datasetOneCtrl.dataset.fe_filters.fabricated);
        fabricatedFilters.forEach(({ choices }) => {
            choices[0].match.field = choices[0].match.field.replace(/^rowParams\./, '');
        });

        return fabricatedFilters;
    }

    function updateFabricatedFilters(updatedFilters) {
        if (!updatedFilters) {
            return;
        }

        const fabricatedFilters = _.cloneDeep(updatedFilters);
        fabricatedFilters.forEach(({ choices }) => {
            choices[0].match.field = `rowParams.${choices[0].match.field}`;
        });

        datasetOneCtrl.dataset.fe_filters.fabricated = fabricatedFilters;

        // update main form only when default filters didn't change
        if (!checkDefaultFilters()) {
            datasetOneCtrl.verifyDatasetValidity();
        }
    }

    function getDefaultFilters() {
        return _.reduce(datasetOneCtrl.dataset.fe_filters.default, (accumulator, value, name) => {
            if (reservedNames.includes(name)) {
                return accumulator;
            }
            accumulator.push({ name, value });
            return accumulator;
        }, []);
    }

    function updateDefaultFilters(updatedFilters) {
        if (!updatedFilters) {
            return;
        }

        const basicFilters = _.pick(datasetOneCtrl.dataset.fe_filters.default, reservedNames);

        datasetOneCtrl.dataset.fe_filters.default = updatedFilters.reduce((accumulator, { name, value }) => {
            accumulator[name] = value;
            return accumulator;
        }, basicFilters);
        datasetOneCtrl.verifyDatasetValidity();
    }

    function checkDefaultFilters() {
        const removedFilters = _.remove(datasetFiltersCtrl.defaultFilters, ({ name, value }) => {
            const fabricatedFilter = datasetFiltersCtrl.fabricatedFilters.find(({ title }) => title === name);

            return !fabricatedFilter || !fabricatedFilter.choices.some(({ title }) => title === value);
        });

        return removedFilters.length > 0;
    }

    function toggleFilter(column) {
        const fieldsNA = datasetOneCtrl.dataset.fe_filters.fieldsNotAvailable;
        const index = fieldsNA.indexOf(column);

        if (index === -1) {
            fieldsNA.push(column);
        } else {
            fieldsNA.splice(index, 1);
        }

        datasetOneCtrl.verifyDatasetValidity();
    }

    function editFilter({ name, sample, custom, customFieldIndex }) {
        const data = {
            fieldName: name,
            firstRecord: sample,
            custom,
            dataset: datasetOneCtrl.dataset,
            customFieldIndex,
            filterOnly: true,
        };

        modalService
            .openDialog('field', data)
            .then(({ dataset }) => {
                datasetOneCtrl.dataset = dataset;

                resetFields();
                datasetOneCtrl.verifyDatasetValidity();
            })
            .catch(_.noop);
    }

    function addDefaultFilter() {
        datasetFiltersCtrl.defaultFilters.push({ name: '', value: '' });
    }

    function removeDefaultFilter(defaultFilter) {
        _.pull(datasetFiltersCtrl.defaultFilters, defaultFilter);
    }

    function verifyUniqueDefaultFilter(defaultFilter, defaultIndex) {
        const defaultFilterExists = datasetFiltersCtrl.defaultFilters.some(({ name, value }, index) => (
            defaultIndex !== index && defaultFilter.name === name && defaultFilter.value === value
        ));

        datasetFiltersCtrl.form[`defaultValue_${defaultIndex}`].$setValidity('unique', !defaultFilterExists);
    }

    function addFabricated() {
        const emptyFabricated = datasetFiltersCtrl.fabricatedFilters.some(({ title }) => !title);
        if (emptyFabricated) {
            return;
        }

        datasetFiltersCtrl.fabricatedFilters.push({
            title: '',
            choices: [{
                title: '',
                match: {
                    field: '',
                    exist: true,
                    nin: [],
                },
            }],
        });
    }

    function removeFabricated(fabricatedFilter) {
        _.pull(datasetFiltersCtrl.fabricatedFilters, fabricatedFilter);
    }

    function getFabricatedChoices(name) {
        return _.get(datasetFiltersCtrl.fabricatedFilters.find(({ title }) => title === name), 'choices', []);
    }

    function verifyUniqueFabricated(fabricated, fabricatedIndex) {
        let fabricatedTitleUnique = true;
        let fabricatedValueUnique = true;

        datasetFiltersCtrl.fabricatedFilters.forEach(({ title, choices }, index) => {
            if (fabricatedIndex === index) {
                return;
            }

            if (fabricated.title === title) {
                fabricatedTitleUnique = false;
            }

            if (fabricated.choices[0].title === choices[0].title) {
                fabricatedValueUnique = false;
            }
        });

        if (reservedNames.includes(fabricated.title)) {
            fabricatedTitleUnique = false;
        }

        if (reservedNames.includes(fabricated.choices[0].title)) {
            fabricatedValueUnique = false;
        }

        datasetFiltersCtrl.form[`fabricatedTitle_${fabricatedIndex}`].$setValidity('unique', fabricatedTitleUnique);
        datasetFiltersCtrl.form[`fabricatedValue_${fabricatedIndex}`].$setValidity('unique', fabricatedValueUnique);
    }

    function toggleExcludeAll() {
        // Depending on excludeAll we'll need to either make an empty array or one with all filter names
        let excludeFilters;
        if (datasetFiltersCtrl.excludeAll) {
            excludeFilters = [];
        } else {
            excludeFilters = datasetFiltersCtrl.fields.map(({ name }) => name);
        }

        datasetOneCtrl.dataset.fe_filters.fieldsNotAvailable = excludeFilters;
        datasetFiltersCtrl.excludeAll = !datasetFiltersCtrl.excludeAll;

        datasetOneCtrl.verifyDatasetValidity();
    }
}

angular
    .module('arraysApp')
    .controller('DatasetFiltersCtrl', DatasetFiltersCtrl);
