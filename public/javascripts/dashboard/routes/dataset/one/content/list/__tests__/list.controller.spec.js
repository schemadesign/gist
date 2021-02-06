import '../list.controller';
import { merge, set } from 'lodash';
import { pokemon1 } from '../../../../../../../../../internals/testing/backend/fixtures/datasets';

describe('DatasetContentList: Controller', () => {
    let $rootScope, $controller, $scope, $state;
    let injectValues, ctrl;

    beforeEach(() => {
        angular.mock.module('arraysApp');

        inject((_$controller_, _$rootScope_) => {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
        });

        $state = {
            go: jest.fn().mockResolvedValue({}),
        };

        const dataset = merge({}, pokemon1, {
            columns: [
                { name: 'Pokemon No', operation: 'ToInteger' },
                { name: 'Name', operation: 'ToString' },
                { name: 'Max HP', operation: 'ToFloat' },
            ],
        });

        $scope = $rootScope.$new();

        $scope.datasetOneCtrl = {
            dataset,
            additionalDatasources: [],
        };

        $scope.datasetCtrl = {
            showGenericErrorToast: jest.fn(),
            showSimpleToast: jest.fn(),
        };

        const entries = {
            entries: [
                { name: 'one', rowParams: { 'Pokemon No_': 'first' } },
                { name: 'two', rowParams: { 'Pokemon No_': 'second' } },
            ],
            numberOfEntries: 2,
        };

        injectValues = {
            $scope,
            $state,
            entries,
            Content: {
                query: jest.fn().mockReturnValue({
                    $promise: Promise.resolve({}),
                }),
                update: jest.fn().mockReturnValue({
                    $promise: Promise.resolve({}),
                }),
                remove: jest.fn().mockReturnValue({
                    $promise: Promise.resolve({}),
                }),
            },
            $mdDialog: {
                show: jest.fn().mockResolvedValue({}),
            },
            CONTENT_LIST_PAGE_LIMIT: 10,
            $document: [{}],
        };

        set(window, '_.debounce', fn => fn);

        ctrl = $controller('ContentListCtrl', injectValues);

        ctrl.form = {};
    });

    it('should set parameters', () => {
        expect(ctrl.entries).toEqual([
            { name: 'one', rowParams: { 'Pokemon No_': 'first' } },
            { name: 'two', rowParams: { 'Pokemon No_': 'second' } },
        ]);
        expect(ctrl.paging).toEqual({
            itemsPerPage: 10,
            totalItems: 2,
            currentPage: 1,
            totalPages: 1,
        });
        expect(ctrl.filterList).toEqual(expect.any(Array));
        expect(ctrl.sortList).toEqual(expect.any(Array));
        expect(ctrl.filterBy).toEqual(expect.any(String));
        expect(ctrl.sortBy).toEqual(expect.any(String));
        expect(ctrl.entriesLoaded).toEqual(true);
    });

    describe('when #queryUpdated is called', () => {
        it('should request updated data', () => {
            ctrl.queryUpdated();

            expect(injectValues.Content.query).toHaveBeenCalledWith({
                datasetId: pokemon1._id,
                page: 1,
                limit: 10,
                filter: expect.any(String),
                title: expect.any(String),
                sort: expect.any(String),
            });
        });

        it('should update entries', async () => {
            injectValues.Content.query = jest.fn().mockReturnValue({
                $promise: Promise.resolve({
                    entries: [{ entry: 'new' }],
                    numberOfEntries: 10,
                }),
            });
            await ctrl.queryUpdated();

            expect(ctrl.entries).toEqual([{ entry: 'new' }]);
            expect(ctrl.paging.totalItems).toBe(10);
        });

        it('should show error on failure', async () => {
            injectValues.Content.query = jest.fn().mockReturnValue({
                $promise: Promise.reject({}),
            });
            await ctrl.queryUpdated();

            expect($scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
        });
    });

    describe('when #editEntry is called', () => {
        it('should redirect', () => {
            ctrl.editEntry(40);

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.content.edit', {
                id: pokemon1._id,
                entryId: 40,
            });
        });

        it('should show an error on redirection failure', async () => {
            injectValues.$state.go = jest.fn().mockRejectedValue({});

            await ctrl.editEntry(1);

            expect($scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
        });
    });

    describe('when #updateEntryStatus is called', () => {
        it('should update data', () => {
            ctrl.updateEntryStatus({
                _id: 60,
                published: true,
            });

            expect(injectValues.Content.update).toHaveBeenCalledWith({
                datasetId: pokemon1._id,
                entryId: 60,
            }, { published: true });
        });

        it('should show toast', async () => {
            await ctrl.updateEntryStatus({
                _id: 60,
                rowParams: { 'Pokemon No_': 'pokemon' },
                published: true,
            });

            expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith('pokemon published');
        });

        it('should show error on failure', async () => {
            injectValues.Content.update = jest.fn().mockReturnValue({
                $promise: Promise.reject({}),
            });
            await ctrl.updateEntryStatus({});

            expect($scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
        });
    });

    describe('when #removeEntry is called', () => {
        it('should open a dialog', () => {
            ctrl.removeEntry();

            expect(injectValues.$mdDialog.show).toHaveBeenCalled();
        });

        it('should remove content', async () => {
            await ctrl.removeEntry({ _id: 80 });

            expect(injectValues.Content.remove).toHaveBeenCalledWith({
                datasetId: pokemon1._id,
                entryId: 80,
            });
        });

        it('should remove selected entry from the list', async () => {
            const entry = _.clone(injectValues.entries.entries[0]);
            await ctrl.removeEntry(injectValues.entries.entries[0]);

            expect(ctrl.entries).not.toContainEqual(entry);
            expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith('first deleted');
        });

        it('should show error on failure', async () => {
            injectValues.Content.remove = jest.fn().mockReturnValue({
                $promise: Promise.reject({}),
            });
            await ctrl.removeEntry({});

            expect($scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
        });
    });

    describe('when #getFilterName is called', () => {
        it('should return name of selected filter', () => {
            expect(ctrl.getFilterName()).toEqual('All');

            ctrl.filterBy = 'published';

            expect(ctrl.getFilterName()).toEqual('Published');
        });
    });
});
