import { addAxes } from '../add-axes';


jest.mock('../../../../libs/datasources/imported_data_preparation');
jest.mock('../get-coercion-operations');
jest.mock('../../../../controllers/client/func');

describe('Add axes middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            camelCaseViewType: 'barChart',
            dataSource: {
                fe_views: {
                    views: {
                        barChart: {
                            defaultXAxisField: 'X',
                            defaultYAxisField: 'Y',
                        },
                    },
                },
            },
        };
        res = {};
        next = jest.fn();
    });

    it('should use the passed axes', () => {
        // Testing with passing yAxis and xAxis
        req.query = {
            yAxis: 'Y',
            xAxis: 'X',
        };
        addAxes(req, res, next);

        expect(req.axes.xAxis).toBe(req.query.xAxis);
        expect(req.axes.yAxis).toBe(req.query.yAxis);
        expect(next).toHaveBeenCalled();

        // Testing passing with no axes
        req.query = {};
        addAxes(req, res, next);
        expect(req.axes.xAxis).toBe(req.query.xAxis);
        expect(req.axes.yAxis).toBe(req.query.yAxis);
    });
});
