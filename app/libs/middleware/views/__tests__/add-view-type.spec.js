import { VIEW_TYPE_GALLERY } from '../../../../config/views.config';
import { addViewType } from '../add-view-type';


describe('Add view type middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {};
        res = {};
        next = jest.fn();
    });

    it('should add view type for valid query', () => {
        req.query = { viewType: VIEW_TYPE_GALLERY };

        addViewType(req, res, next);

        expect(req).toHaveProperty('viewType', VIEW_TYPE_GALLERY);
    });

    it('should not add view type for invalid valid query', () => {
        req.query = { viewType: 'nothing' };

        addViewType(req, res, next);

        expect(req).not.toHaveProperty('viewType');
    });
});
