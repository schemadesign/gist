'use strict';

angular
    .module('arraysApp', [
        'ui.router',
        'ui.router.state.events', // required for $stateChange* polyfill
        'ui.bootstrap',
        'ngMaterial',
        'ngMessages',
        'ngResource',
        'ngCookies',
        'minicolors',
        'angularFileUpload',
        'ui.sortable',
        'angular-cron-jobs',
        'angularSpinner',
        'ui.bootstrap.pagination',
        'ngSanitize',
        'angular-markdown-editor',
        'oc.lazyLoad',
        'ngFileSaver',
        'selectionModel'
    ])
    .run(function ($rootScope, $transitions, $mdDialog, modalService) {
        $transitions.onStart({}, (transition) => {
            const { name: toState } = transition.to();
            const { name: fromState } = transition.from();

            $rootScope._loading = toState;

            const now = new Date();
            $rootScope.copyrightYear = now.getFullYear();

            if ($rootScope._remindUserUnsavedChanges) {
                if (fromState.startsWith('dashboard.dataset.one')) {
                    if (!_.isEqual(_.take(fromState.split('.'), 4), _.take(toState.split('.'), 4)) || fromState.startsWith('dashboard.dataset.one.content')) {
                        return $mdDialog
                            .show(modalService.openConfirmModal(
                                'Your visualization has unsaved changes',
                                'Your visualization has unsaved changes that may be lost. Process your changes to save.',
                                'Continue editing',
                                'Discard changes'
                            ))
                            .then(() => _.invoke($rootScope, 'onAfterDiscardChanges'))
                            .then(() => {
                                $rootScope._remindUserUnsavedChanges = false;
                                return true;
                            })
                            .catch(_.constant(false));
                    }
                }
            }
        });

        $transitions.onSuccess({}, () => ($rootScope._loading = ''));
        $transitions.onError({}, () => ($rootScope._loading = ''));
    });
