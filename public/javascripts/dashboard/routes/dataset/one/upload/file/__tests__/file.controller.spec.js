import { merge } from 'lodash';

import '../../../../../../app';
import '../file.controller';
import { pokemon1 } from '../../../../../../../../../internals/testing/backend/fixtures/datasets';

describe('DatasetUploadFile: Controller', () => {
    let $rootScope, $controller, $scope, $state;
    let injectValues, ctrl;
    const successInvokePath = 'someMethod';

    beforeEach(() => {
        angular.mock.module('arraysApp');

        inject(function(_$controller_, _$rootScope_) {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
        });

        const dataset = merge({}, pokemon1);
        const FileUploader = jest.fn().mockImplementation(() => ({
            cancelAll: jest.fn(),
            destroy: jest.fn(),
            clearQueue: function() {
                this.queue = [];
            },
            addToQueue: function(item) {
                this.queue.push(item);
            },
        }));

        $state = {
            params: {
                title: 'Upload',
                uploadEndpoint: '/endpoint',
                uploadParams: {
                    replacement: true,
                    child: undefined,
                },
                successInvokePath,
            },
            go: jest.fn(),
        };
        $scope = $rootScope.$new();

        $scope.datasetCtrl = {
            showSimpleToast: jest.fn(),
            showGenericErrorToast: jest.fn(),
        };

        $scope.datasetOneCtrl = {
            dataset,
        };

        $scope.datasetUploadCtrl = {
            onApiEndpointSet: jest.fn(),
            [successInvokePath]: jest.fn(),
        };

        $scope.user = {
            role: 'admin',
        };

        $scope.team = {
            isEnterprise: false,
        };

        const DatasetService = {
            connectToRemoteDatasource: jest.fn().mockResolvedValue(),
        };

        injectValues = {
            $scope,
            $state,
            $mdDialog: {
                show: jest.fn(),
            },
            DatasetService,
            AuthService: {
                getToken: jest.fn().mockReturnValue('some-token'),
            },
            FileUploader,
        };

        ctrl = $controller('DatasetUploadFileCtrl', injectValues);
    });

    it('should set defaults', () => {
        expect(ctrl).toMatchObject({
            progressMode: 'determinate',
            JSONPath: '*',
        });
    });

    it('should init uploader', () => {
        expect(injectValues.FileUploader).toHaveBeenCalledWith({
            url: '/endpoint',
            formData: [{ id: pokemon1._id, replacement: true }],
            queueLimit: 1,
            headers: {
                Authorization: 'Bearer some-token',
            },
        });
    });

    it('should revoke uploader on $scope.$destroy', () => {
        $scope.$emit('$destroy');

        expect(ctrl.uploader.cancelAll).toHaveBeenCalled();
        expect(ctrl.uploader.destroy).toHaveBeenCalled();
    });

    describe('getFileType', () => {
        it('should return file.type', () => {
            expect(ctrl.getFileType()).toBe('*');
        });
    });

    describe('getTitle', () => {
        it('should return $state.params.title', () => {
            expect(ctrl.getTitle()).toBe('Upload');
        });
    });

    describe('hasFile', () => {
        it('should return true if queue is not empty', () => {
            ctrl.uploader.queue = [{}];

            expect(ctrl.hasFile()).toBeTruthy();
        });

        it('should return false if queue is empty', () => {
            ctrl.uploader.queue = [];

            expect(ctrl.hasFile()).toBeFalsy();
        });
    });

    describe('getUploadItem', () => {
        it('should return first element from uploader queue', () => {
            ctrl.uploader.queue = [{ key: 'val' }];

            expect(ctrl.getUploadItem()).toEqual({ key: 'val' });
        });
    });

    describe('getFileName', () => {
        it('should return name of first queue element', () => {
            ctrl.uploader.queue = [{ file: { name: 'filename.csv' } }];

            expect(ctrl.getFileName()).toBe('filename.csv');
        });
    });

    describe('inputAccept', () => {
        it('should return proper mimetype for spreadsheet', () => {
            expect(ctrl.inputAccept).toBe('.csv, .tsv, text/csv, text/csv-schema, text/tsv');
        });
    });

    describe('uploader.onCompleteItem', () => {
        it('should invoke datasetUploadCtrl[successInvokePath]', () => {
            ctrl.uploader.onCompleteItem({ file: { name: 'filename.csv' } }, { key: 'val' }, 200);

            expect(ctrl.progressMode).toBe('determinate');
            expect($scope.datasetUploadCtrl[successInvokePath]).toHaveBeenCalledWith({ key: 'val' });
        });

        it('should show missing samples modal if there are missing samples', () => {
            ctrl.uploader.onCompleteItem({ file: { name: 'filename.csv' } }, { missingSamples: ['col'] }, 200);

            expect(injectValues.$mdDialog.show).toHaveBeenCalled();
        });

        it('should show success toast if there are no missing samples', () => {
            ctrl.uploader.onCompleteItem({ file: { name: 'filename.csv' } }, { missingSamples: [] }, 200);

            expect(injectValues.$mdDialog.show).not.toHaveBeenCalled();
            expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith('filename.csv uploaded!');
        });

        it('should go to dashboard.dataset.error if status is not 200', () => {
            ctrl.uploader.onCompleteItem({ file: {} }, { error: 'err' }, 403);

            expect($state.go).toHaveBeenCalledWith('dashboard.dataset.error', {
                id: pokemon1._id,
                type: 'badFormat',
                errMsg: 'err',
                returnTo: 'dashboard.dataset.one.upload',
            });
        });

        it('should not do anything if status is not 0 (aborted)', () => {
            ctrl.uploader.onCompleteItem({ file: {} }, {}, 0);

            expect($state.go).not.toHaveBeenCalled();
        });
    });

    describe('uploader.onWhenAddingFileFailed', () => {
        it('should replace queue with new file if filter name is "queueLimit"', () => {
            ctrl.uploader.queue = [{ name: 'oldfile.csv' }];
            ctrl.uploader.onWhenAddingFileFailed({ name: 'newfile.csv' }, { name: 'queueLimit' });

            expect(ctrl.uploader.queue).toEqual([{ name: 'newfile.csv' }]);
        });

        it('should show generic error toast if filter name is not "queueLimit"', () => {
            ctrl.uploader.onWhenAddingFileFailed({ name: 'newfile.csv' }, { name: 'other' });

            expect($scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
        });
    });

    describe('uploader.onBeforeUploadItem', () => {
        it('should assign JSONPath to formData', () => {
            const item = {
                formData: [{}],
            };

            ctrl.JSONPath = 'sth.*';
            ctrl.uploader.onBeforeUploadItem(item);

            expect(item).toEqual({
                formData: [{ JSONPath: 'sth.*' }],
            });
        });
    });

    describe('uploader.onProgressAll', () => {
        it('should change progressMode to indeterminate if progress is 100', () => {
            ctrl.progressMode = 'deteminate';
            ctrl.uploader.onProgressAll(100);

            expect(ctrl.progressMode).toBe('indeterminate');
        });

        it('should not change progressMode if progress is not 100', () => {
            ctrl.progressMode = 'deteminate';
            ctrl.uploader.onProgressAll(99);

            expect(ctrl.progressMode).toBe('deteminate');
        });
    });
});
