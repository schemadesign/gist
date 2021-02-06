import { pokemon1 } from '../../../../../internals/testing/backend/fixtures/datasets';
import { hydrateDb } from '../../../../../internals/testing/backend/utils';
import { VIEW_TYPE_AREA_CHART, VIEW_TYPE_GALLERY } from '../../../../config/views.config';
import { addObjectDetailsPagination } from '../add-object-details-pagination';


describe('Add object details pagination middleware', () => {
    let req, res, next;

    beforeEach(async () => {
        await hydrateDb();
        req = {
            query: {},
            dataSource: Object.assign({}, pokemon1),
            dataPrepOptions: {},
        };
        res = {};
        next = jest.fn();
    });

    it('should not add pagination when no object index is provided', async () => {
        await addObjectDetailsPagination(req, res, next);

        expect(req).not.toHaveProperty('objectIndex');
    });

    it('should not add pagination for not included view', async () => {
        req.query.viewType = VIEW_TYPE_AREA_CHART;
        await addObjectDetailsPagination(req, res, next);

        expect(req).not.toHaveProperty('objectIndex');
    });

    it('should add pagination for first result', async () => {
        req.viewType = VIEW_TYPE_GALLERY;
        req.query.objectIndex = 0;
        await addObjectDetailsPagination(req, res, next);

        expect(req).toHaveProperty('objectDetailsPagination', expect.any(Object));
        expect(req).toHaveProperty('objectIndex', 0);
        expect(req.objectDetailsPagination).toMatchSnapshot();
    });

    it('should add pagination for another result', async () => {
        req.viewType = VIEW_TYPE_GALLERY;
        req.query.objectIndex = 2;
        await addObjectDetailsPagination(req, res, next);

        expect(req).toHaveProperty('objectDetailsPagination', expect.any(Object));
        expect(req).toHaveProperty('objectIndex', 2);
        expect(req.objectDetailsPagination).toMatchSnapshot();
    });
});
