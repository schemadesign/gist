import '../content.controller';


describe('DatasetContent: Controller', () => {
    let $rootScope, $controller, $scope;
    let injectValues, ctrl;

    beforeEach(() => {
        angular.mock.module('arraysApp');

        inject((_$controller_, _$rootScope_) => {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
        });

        $scope = $rootScope.$new();

        $scope.openUnsavedChangesDialog = jest.fn().mockResolvedValue({});
        $scope.setRemindUserUnsavedChanges = jest.fn();
        $scope.datasetOneCtrl = {
            getSortedColumns: jest.fn(),
        };

        const DATA_TYPES = [
            { data_type: 'Date', operation: 'ToDate' },
            { data_type: 'Number', operation: 'ToInteger' },
            { data_type: 'Number with decimal cases', operation: 'ToFloat' },
            { data_type: 'Text', operation: 'ToString' },
            { data_type: 'Percent', operation: 'ToPercent' },
        ];

        const ADVANCED_DATA_TYPES = [
            { data_type: 'String Trim', operation: 'ToStringTrim' },
            { data_type: 'Proxy', operation: 'ProxyExisting' },
            { data_type: 'Currency', operation: 'ToCurrency' },
        ];

        injectValues = {
            $scope,
            DATA_TYPES,
            ADVANCED_DATA_TYPES,
        };

        ctrl = $controller('ContentCtrl', injectValues);
    });

    describe('when #operationToString is called', () => {
        it('should return correct values', () => {
            expect(ctrl.operationToString('ProxyExisting')).toBe('Proxy');
            expect(ctrl.operationToString('ToDate')).toBe('Date');
            expect(ctrl.operationToString('ToInteger')).toBe('Number');
            expect(ctrl.operationToString('ToFloat')).toBe('Number with decimal cases');
            expect(ctrl.operationToString('ToPercent')).toBe('Percent');
            expect(ctrl.operationToString('ToStringTrim')).toBe('String Trim');
            expect(ctrl.operationToString('ToCurrency')).toBe('Currency');
        });

        it('should return text by default', () => {
            expect(ctrl.operationToString('other')).toBe('Text');
        });
    });
});
