function gistViewInputIconMapping(AssetService, DatasetService) {
    return {
        restrict: 'E',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/inputs/icon-mapping/icon-mapping.template.html',
        controller($scope) {
            const { viewCtrl, setting } = $scope;
            const { ICONS, NOT_SPECIFIED } = window.arrays.constants;

            $scope.notSpecified = NOT_SPECIFIED;
            $scope.notSpecifiedLabel = 'Not Specified';
            $scope.addMoreIconMappings = addMoreIconMappings;
            $scope.removeIconField = removeIconField;
            $scope.makeRelative = makeRelative;
            $scope.isOutOfList = isOutOfList;
            $scope.changeCachedValues = changeCachedValues;
            $scope.handleOpenPicker = handleOpenPicker;
            $scope.handleTabClick = handleTabClick;
            $scope.handleSelectOption = handleSelectOption;

            $scope.tabs = ICONS.ORDER.map((name) => ({
                name,
                src: `/images/icons/tabs/${name}.png`,
            }));
            $scope.iconsUrls = [];

            getCachedValues(viewCtrl.data[setting.name].field);
            loadIcons();

            function changeCachedValues(value) {
                // reset conditions on changing tile
                viewCtrl.data[setting.name].conditions = [];
                getCachedValues(value);
            }

            function getCachedValues(value) {
                DatasetService.getCachedValues(viewCtrl.dataset._id, value)
                    .then(({ data }) => ($scope.keywords = data.length ? [...data, NOT_SPECIFIED] : []));
            }


            function addMoreIconMappings() {
                viewCtrl.data[setting.name].conditions.push({});
            }

            function removeIconField(index) {
                viewCtrl.data[setting.name].conditions.splice(index, 1);
            }

            function loadIcons() {
                AssetService
                    .loadIcons()
                    .then((data) => {
                        $scope.iconsUrls = [];
                        $scope.sets = ICONS.ORDER.map((group, index) => {
                            const icons = ICONS.SETS[group] || [];
                            const prefix = ICONS.PREFIX[group];

                            return {
                                name: group,
                                icons: icons.map((name) => {
                                    const src = `/images/icons/${prefix}${name}.png`;

                                    $scope.iconsUrls.push(src);

                                    return { name, src };
                                })
                            };
                        });

                        const customsId = _.findIndex(ICONS.ORDER, (id) => id === ICONS.GROUPS.CUSTOMS);

                        $scope.sets[customsId].icons = data.map((name) => ({
                            name,
                            src: name
                        }));

                        $scope.iconsUrls.push(...data);
                    });
            }

            function makeRelative(url = '') {
                if (url.startsWith('/images')) {
                    return url;
                }
                // assets is the only thing that is constant so we can split on it and then prepend it back on the
                // relative url
                const splitUrl = url.split('assets')[1];

                return `/assets${splitUrl}`;
            }

            function isOutOfList(url) {
                return !_.isEmpty(url) && url.startsWith('/images') && !$scope.iconsUrls.includes(url);
            }

            function realignPicker(index) {
                setTimeout(() => {
                    const container = document.querySelector(`.icons-picker-${index}`);

                    if (!container) {
                        return;
                    }

                    const select = document.querySelector(`.icons-md-select-${index}`);
                    const position = select.getBoundingClientRect();
                    const iconsOffset = 46;

                    const xPosition = `${position.left + iconsOffset}px`;
                    const isAdjusted = container.style.left === xPosition;

                    container.style.left = xPosition;

                    if (!isAdjusted) {
                        realignPicker(index);
                    }
                }, 70);
            }

            function handleOpenPicker(index) {
                // hack to fix md-select misalignment after click
                realignPicker(index);
            }

            function handleTabClick(pickerIndex, index) {
                const iconPicker = $(`.icons-picker-${pickerIndex}`);
                const iconPickerContent = iconPicker.find('md-content');

                iconPickerContent.scrollTop(0);

                if (index) {
                    const y = iconPicker.find(`md-optgroup:nth-of-type(${index + 1})`).position().top;
                    const headerOffset = 50;

                    iconPickerContent.scrollTop(y - headerOffset);
                }
            }

            function handleSelectOption(pickerIndex) {
                $(`.icons-picker-${pickerIndex}`).hide();
            }
        }
    };
}

angular.module('arraysApp')
    .directive('gistViewInputIconMapping', gistViewInputIconMapping);
