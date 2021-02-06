function gistViewInputRegionMatchBy() {
    return {
        restrict: 'E',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/inputs/region-match-by/region-match-by.template.html',
        controller($scope) {
            const { viewCtrl } = $scope;

            $scope.updateRegion = updateRegion;

            // the region definitions from the RegionalMap lookup data
            $scope.regionDefinitions = viewCtrl.viewLookup.regionDefinitions;

            // the region the user has selected, or default to the first region
            let selectedRegion = $scope.regionDefinitions.find(({ id }) => id === viewCtrl.data.region);
            selectedRegion = selectedRegion && selectedRegion.length === 1 ? selectedRegion[0] : $scope.regionDefinitions[0];
            $scope.selectedRegion = selectedRegion;

            updateRegion(selectedRegion);

            // watch changes to scope objects that need to be saved to a data property, but only the id
            function updateRegion(selectedRegion) {
                if (!selectedRegion) {
                    return;
                }

                // update the region field in the dataset's view settings, if they've been initialized on the scope
                if (viewCtrl.data) {
                    viewCtrl.data.region = selectedRegion.id;
                }

                // for now, this will be 'name' but may expand in the future to things like postal code, FIPS code,
                // ISO, etc; at which point it will need to be saved in the dataset's view settings
                $scope.selectedMatchBy = selectedRegion.matchByOptions[0];

                // the parent region, relevant if the main region can't be uniquely matched to data based only on
                // its name defined as a property on the region definition, not the dataset
                let selectedParentRegion = $scope.regionDefinitions.find(({ id }) => id === selectedRegion.parent);
                selectedParentRegion = selectedParentRegion && selectedParentRegion.length === 1 ? selectedParentRegion[0] : null;

                // for now, this will be 'name' but may expand in the future to things like postal code, FIPS code,
                // ISO, etc; at which point it will need to be saved in the dataset's view settings
                $scope.selectedParentMatchBy = selectedParentRegion ? selectedParentRegion.matchByOptions[0] : null;

                // the grandparent region, relevant if the main region can't be uniquely matched to data based only
                // on its name defined as a property on the region definition, not the dataset
                let selectedGrandparentRegion = $scope.regionDefinitions.find(({ id }) => id === selectedRegion.grandparent);
                selectedGrandparentRegion = selectedGrandparentRegion && selectedGrandparentRegion.length === 1 ? selectedGrandparentRegion[0] : null;

                // for now, this will be 'name' but may expand in the future to things like postal code, FIPS code,
                // ISO, etc; at which point it will need to be saved in the dataset's view settings
                $scope.selectedGrandparentMatchBy = selectedGrandparentRegion ? selectedGrandparentRegion.matchByOptions[0] : null;
            }
        },
    };
}

angular.module('arraysApp')
    .directive('gistViewInputRegionMatchBy', gistViewInputRegionMatchBy);
