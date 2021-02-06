(function() {
    function ArraysAppDatasetViewTileCtrl() {
        var arraysAppDatasetViewTileCtrl = this;

        arraysAppDatasetViewTileCtrl.tileClickHandler = function() {
            if (typeof arraysAppDatasetViewTileCtrl.onClickFn === 'function') {
                arraysAppDatasetViewTileCtrl.onClickFn.apply(undefined, arraysAppDatasetViewTileCtrl.onClickArgs);
            } else {
                console.log('No function set for on-click-fn');
            }
        };

        arraysAppDatasetViewTileCtrl.visibilityChange = function() {
            arraysAppDatasetViewTileCtrl.onVisibilityChange({
                viewName: arraysAppDatasetViewTileCtrl.viewName,
                visibility: arraysAppDatasetViewTileCtrl.isVisible
            });
        };

        arraysAppDatasetViewTileCtrl.setDefault = function() {
            arraysAppDatasetViewTileCtrl.onSetDefault({
                viewName: arraysAppDatasetViewTileCtrl.viewName
            });
        };

        arraysAppDatasetViewTileCtrl.$onInit = function() {
            arraysAppDatasetViewTileCtrl.backgroundStyle = {};

            const style = arraysAppDatasetViewTileCtrl.backgroundStyle;

            if (arraysAppDatasetViewTileCtrl.viewThumbnail) {
                style['background-image'] = `url(${arraysAppDatasetViewTileCtrl.viewThumbnail})`;
            } else {
                style['background-image'] = 'url(/images/explore/default_pattern.png)';
                style['background-color'] = '#005CB5';
            }
        };
    }

    angular.module('arraysApp')
        .component('aaDatasetViewTile', {
            templateUrl: 'templates/components/aa-dataset-view-tile.html',
            controller: ArraysAppDatasetViewTileCtrl,
            controllerAs: 'arraysAppDatasetViewTileCtrl',
            bindings: {
                viewName: '<',
                viewDisplayName: '<',
                viewThumbnail: '<',
                isVisible: '<',
                isDefaultView: '<',
                onClickFn: '<',
                onClickArgs: '<',
                showOptionsMenu: '<',
                onVisibilityChange: '&',
                onSetDefault: '&'
            },
        });

}());
