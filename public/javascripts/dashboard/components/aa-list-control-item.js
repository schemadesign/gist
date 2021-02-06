(function() {
    function ArraysAppListControlItemCtrl() {
        var ctrl = this;

        /**
         * Handle click event for title
         */
        ctrl.textClickHandler = function() {
            if (typeof ctrl.textOnClick === 'function') {
                ctrl.textOnClick.apply(undefined, ctrl.textOnClickArgs);
            } else {
                console.log('No function set for text-on-click');
            }
        };

        /**
         * Handle click events for buttons
         */
        var buttonClickHandlers = [];

        ctrl.buttonClickHandler = function(index) {
            var handler = buttonClickHandlers[index];

            if (typeof handler.fn === 'function') {
                handler.fn.apply(undefined, handler.args);
            }
        };

        ctrl.$onInit = function() {
            // Register buttonClickHandlers
            for (var i = 0; i < ctrl.buttons.length; i++) {
                buttonClickHandlers.push({
                    fn: ctrl.buttons[i].onClick,
                    args: ctrl.buttons[i].onClickArgs
                });
            }
        };
    }

    angular.module('arraysApp')
        .filter('aaListControlHint', function() {
            return function(hint) {
                if (hint) {
                    hint = '(' + hint + ')';
                }

                return hint;
            };
        });

    angular.module('arraysApp')
        .component('aaListControlItem', {
            templateUrl: 'templates/components/aa-list-control-item.html',
            controller: ArraysAppListControlItemCtrl,
            bindings: {
                text: '<',
                hint: '<',
                textOnClick: '<',
                textOnClickArgs: '<',
                buttons: '<',
                disabled: '<'
            },
        });

}());
