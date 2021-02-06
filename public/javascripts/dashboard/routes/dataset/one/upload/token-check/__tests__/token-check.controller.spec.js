import '../../../../../../app';
import '../token-check.controller';
import { merge } from 'lodash';
import { pokemon1 } from '../../../../../../../../../internals/testing/backend/fixtures/datasets';
import { user2 } from '../../../../../../../../../internals/testing/backend/fixtures/users';

describe('DatasetTokenCheckCtrl:Controller', () => {
    let $rootScope, $controller, $scope;
    let injectValues;

    beforeEach(() => {
        angular.mock.module('arraysApp');

        inject(function (_$controller_, _$rootScope_) {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
        });

        const dataset = merge({}, pokemon1);
        const $state = {
            go: jest.fn(),
        };

        const $window = {
            open: jest.fn(),
        };

        $scope = $rootScope.$new();

        $scope.datasetCtrl = {
            showSimpleToast: jest.fn(),
            showGenericErrorToast: jest.fn(),
        };

        $scope.datasetOneCtrl = {
            dataset,
        };


        const User = {
            currentUser: jest.fn().mockReturnValue({
                $promise: Promise.resolve(user2),
            }),
        };

        const Salesforce = {
            validateToken: jest.fn().mockReturnValue({
                $promise: Promise.resolve({ isValidToken: false }),
            }),
        };

        injectValues = {
            $scope,
            $state,
            $window,
            User,
            Salesforce,
        };
    });

    describe('when is pipedirve token', () => {
        beforeEach(() => {
            injectValues.$state.params = {
                type: 'pipedrive',
            };

            injectValues.$scope.user = {
                hasPipedriveToken: true,
            };

            $controller('DatasetTokenCheckCtrl', injectValues);
        });

        it('should call #state.go to the Pipedrive Controller', () => {
            expect(injectValues.$state.go).toHaveBeenCalledWith(`dashboard.dataset.one.upload.main.${injectValues.$state.params.type}`);
        });

        it('should reload user if a token does not exist', () => {
            injectValues.$scope.user.hasPipedriveToken = false;
            $controller('DatasetTokenCheckCtrl', injectValues);

            expect(injectValues.User.currentUser).toHaveBeenCalled();
        });

        it('should not redirect if hasTypeToken is not in $scope.user', () => {
            injectValues.$state.params.type = 'doesnotexist';
            $controller('DatasetTokenCheckCtrl', injectValues);

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.upload');
        });
    });

    describe('when is salesforce token', () => {
        beforeEach(() => {
            injectValues.$state.params = {
                type: 'salesforce',
            };

            injectValues.$scope.user = {
                hasSalesforceToken: true,
            };
        });

        it('should call #state.go to the Salesforce Controller', async () => {
            injectValues.Salesforce = {
                validateToken: jest.fn().mockReturnValue({
                    $promise: Promise.resolve({ isValidToken: true }),
                }),
            };

            await $controller('DatasetTokenCheckCtrl', injectValues);

            expect(injectValues.$state.go).toHaveBeenCalledWith(`dashboard.dataset.one.upload.main.${injectValues.$state.params.type}`);
        });

        it('should check current user', async () => {
            await $controller('DatasetTokenCheckCtrl', injectValues);

            expect(injectValues.User.currentUser).toHaveBeenCalled();
        });


        it('should check current user on reject validating token', async () => {
            injectValues.Salesforce = {
                validateToken: jest.fn().mockReturnValue({
                    $promise: Promise.reject({}),
                }),
            };

            await $controller('DatasetTokenCheckCtrl', injectValues);

            expect(injectValues.User.currentUser).toHaveBeenCalled();
        });
    });
});
