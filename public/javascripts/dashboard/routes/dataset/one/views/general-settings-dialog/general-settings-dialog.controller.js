function GeneralSettingsDialogCtrl($scope, $mdDialog, dataset, colsAll, imageFields, DatasetService, team) {
    $scope.dataset = angular.copy(dataset);
    $scope.imageFields = imageFields;
    $scope.colsAvailable = colsAll;

    if (!$scope.dataset.fe_viewOptions) {
        $scope.dataset.fe_viewOptions = {
            filtersRail: true,
            search: true,
            viewControls: true,
            viewInteractivity: true,
            enableAccessibility: true,
            fullscreenExpand: true,
        };
    }

    // Scope.watch seems to only work for object properties
    // https://github.com/angular/material/issues/1714

    const colorMapping = $scope.dataset.colorMapping || {};
    const dotRegEx = new RegExp(arrays.constants.DOT_REPLACEMENT, 'g');
    const updatedRules = _.mapKeys(colorMapping, (value, key) => key.replace(dotRegEx, '.'));

    $scope.colorMapping = {
        fieldForCache: $scope.dataset.objectTitle,
        cachedValues: [],
        rules: updatedRules,
    };

    $scope.teamColorPalette = team.colorPalette;

    // Default cachedValues to ObjectTitle field
    getCachedColorMapping();

    $scope.$watch(
        'colorMapping.fieldForCache',
        (oldValue, newValue) => {
            if (oldValue !== newValue) {
                getCachedColorMapping();
            }
        },
        true
    );

    // Save color and value to color mapping object
    $scope.addColor = (color, value) => {
        if (color && value) {
            $scope.colorMapping.rules[value] = color;
        }
    };

    $scope.removeColorRule = value => {
        delete $scope.colorMapping.rules[value];
    };

    $scope.cancel = () => {
        $mdDialog.cancel();
    };

    $scope.save = () => {
        const editedFields = [
            'objectTitle',
            'objectSubtitle',
            'fe_image',
            'fe_filters',
            'colorMapping',
            'fe_viewOptions',
        ];

        $scope.dataset.colorMapping = $scope.colorMapping.rules;

        if (!$scope.dataset.fe_image.field || !$scope.dataset.fe_filters.default['Has Image']) {
            _.unset($scope.dataset.fe_filters.default, 'Has Image');
        }

        if (!$scope.dataset.fe_filters.default['Has Title']) {
            _.unset($scope.dataset.fe_filters.default, 'Has Title');
        }

        $mdDialog.hide(_.pick($scope.dataset, editedFields));
    };

    function getCachedColorMapping() {
        if (!$scope.colorMapping.fieldForCache) {
            return;
        }

        DatasetService.getCachedValues(dataset._id, $scope.colorMapping.fieldForCache).then(({ data }) => {
            $scope.colorMapping.cachedValues = data;
        });
    }
}

angular.module('arraysApp').controller('GeneralSettingsDialogCtrl', GeneralSettingsDialogCtrl);
