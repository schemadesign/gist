import '../edit-keywords.controller';
import { set } from 'lodash';


describe('Edit keywords: Controller', () => {
    let $controller, injectValues, ctrl;
    const $scope = {};

    const words = _.times(1000, (number) => ({ word: `${number}` }));

    beforeEach(() => {
        angular.mock.module('arraysApp');
        inject((_$controller_) => {
            $controller = _$controller_;
        });

        Object.assign($scope, {
            dashboardCtrl: {
                showSimpleToast: jest.fn(),
            },
        });

        injectValues = {
            $scope,
            DatasetService: {
                getKeywords: jest.fn().mockResolvedValue(
                    {
                        data: [
                            { word: 'keyword 1' },
                            { word: 'keyword 2' },
                            { word: 'keyword 3' },
                            { word: 'keyword 30' },
                            ..._.times(1000, (number) => ({ word: `${number}` })),
                        ],
                    },
                ),
            },
            $mdDialog: {
                hide: jest.fn().mockResolvedValue({}),
            },
            datasetId: 'datasetId',
            field: 'field',
            currentKeywords: ['keyword 1'],
            STOP_WORDS: ['keyword 2'],
        };
    });

    it('should instantiate parameters', () => {
        ctrl = $controller('EditKeywordsController', injectValues);

        expect(ctrl.paginationLimit).toEqual(100);
        expect(ctrl.loading).toEqual(true);
        expect(ctrl.keywords).toEqual([]);
        expect(ctrl.excludeStopWords).toEqual(true);
        expect(ctrl.keywordFilter).toEqual('');
        expect(ctrl.currentPage).toEqual(1);
    });


    describe('when get keywords', () => {
        beforeEach(async () => {
            ctrl = $controller('EditKeywordsController', injectValues);
            ctrl.paginationLimit = 1;
            set(ctrl, 'filterKeywords', jest.fn());
            await injectValues.DatasetService.getKeywords();
        });

        it('should set parameters', () => {
            expect(ctrl.keywords).toEqual([
                { selected: true, word: 'keyword 1' },
                { selected: false, word: 'keyword 2' },
                { selected: false, word: 'keyword 3' },
                { selected: false, word: 'keyword 30' },
                ...words.map(({ word }) => ({ word, selected: false })),
            ]);
            expect(ctrl.loading).toEqual(false);
            expect(ctrl.selectedItemsLength).toEqual(1);
            expect(ctrl.filterKeywords).toHaveBeenCalled();
        });
    });

    describe('after get keywords', () => {
        beforeEach(async () => {
            ctrl = $controller('EditKeywordsController', injectValues);
            await injectValues.DatasetService.getKeywords();
        });

        describe('when selectAll', () => {
            it('should select all keywords', () => {
                ctrl.selectAll();

                expect(ctrl.filteredKeywords).toEqual([
                    { selected: true, word: 'keyword 1' },
                    { selected: true, word: 'keyword 3' },
                    { selected: true, word: 'keyword 30' },
                    ...words.slice(0, 997).map(({ word }) => ({ word, selected: true })),
                    ...words.slice(997, 1000).map(({ word }) => ({ word, selected: false })),
                ]);
                expect(ctrl.selectedItemsLength).toEqual(1000);
            });
        });

        describe('when selectNone', () => {
            it('should deselect all keywords', () => {
                ctrl.selectNone();
                expect(ctrl.filteredKeywords).toEqual([
                    { selected: false, word: 'keyword 1' },
                    { selected: false, word: 'keyword 3' },
                    { selected: false, word: 'keyword 30' },
                    ...words.map(({ word }) => ({ word, selected: false })),
                ]);
                expect(ctrl.selectedItemsLength).toEqual(0);
            });
        });

        describe('when onClick', () => {
            it('should increase selectedItemsLength', () => {
                ctrl.onClick({ word: 'keyword 2', selected: true });
                expect(ctrl.selectedItemsLength).toEqual(2);
            });

            it('should decrease selectedItemsLength', () => {
                ctrl.onClick({ word: 'keyword 1', selected: false });
                expect(ctrl.selectedItemsLength).toEqual(0);
            });

            it('should prevent selecting item and show mdToast', () => {
                const item = { word: 'keyword 1', selected: true };
                ctrl.selectedItemsLength = 1000;
                ctrl.onClick(ctrl.filteredKeywords[0]);
                ctrl.onClick(ctrl.filteredKeywords[0]);
                expect(ctrl.filteredKeywords.find(({ word }) => word === item.word))
                    .toEqual({
                        selected: false,
                        word: 'keyword 1',
                    });

                expect(injectValues.$scope.dashboardCtrl.showSimpleToast).toHaveBeenCalledTimes(1);
                expect(injectValues.$scope.dashboardCtrl.showSimpleToast).toHaveBeenCalledWith('Max 1000 keywords', {
                    hideDelay: 3000,
                    parent: ctrl.element,
                });

                setTimeout(() => {
                    ctrl.onClick(item);
                    expect(injectValues.$scope.dashboardCtrl.showSimpleToast).toHaveBeenCalledTimes(2);
                }, 3000);
            });
        });

        describe('when save', () => {
            it('should hide dialog', () => {
                ctrl.save();
                expect(injectValues.$mdDialog.hide).toHaveBeenCalledWith(['keyword 1']);
            });
        });

        describe('when changePage', () => {
            it('should change page', () => {
                ctrl.changePage(2);
                expect(ctrl.displayedKeywords).toEqual([
                    ...words.slice(97, 197).map(({ word }) => ({ word, selected: false })),
                ]);
            });
        });

        describe('when filterKeywords', () => {
            it('should filter keywords', () => {
                ctrl.keywordFilter = '1';
                ctrl.excludeStopWords = false;
                ctrl.filterKeywords();
                const filteredWords = ctrl.keywords.filter(({ word }) => word.includes(ctrl.keywordFilter));
                expect(ctrl.displayedKeywords).toEqual(filteredWords.slice(0, 100));
                expect(ctrl.numberOfItems).toEqual(filteredWords.length);
                expect(ctrl.filteredKeywords).toEqual(filteredWords);
            });

            it('should filter with stop words', () => {
                ctrl.keywordFilter = '2';
                ctrl.excludeStopWords = true;
                ctrl.filterKeywords();
                const filteredWords = words
                    .filter(({ word }) => word.includes(ctrl.keywordFilter))
                    .map(({ word }) => ({ word, selected: false }));
                expect(ctrl.displayedKeywords).toEqual(filteredWords.slice(0, 100));
                expect(ctrl.numberOfItems).toEqual(filteredWords.length);
                expect(ctrl.filteredKeywords).toEqual(filteredWords);
            });
        });
    });
});
