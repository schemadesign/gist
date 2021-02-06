import { toArray } from 'lodash';

import { processDocs } from '../gallery.helpers';
import { pokemon1 } from '../../../../../../internals/testing/backend/fixtures/datasets';
import { team1 } from '../../../../../../internals/testing/backend/fixtures/teams';
import * as processedRowObjects from '../../../../../../internals/testing/backend/fixtures/pokemon1ProcessedRowObjects';


describe('gallery helpers', () => {
    describe('processDocs', () => {
        let options, dataSet;

        beforeEach(() => {
            options = {
                sortBy: 'Name',
                sortBy_realColumnName: 'Name',
            };
            dataSet = Object.assign({}, pokemon1, { _team: team1 });
        });

        it('should return docs', () => {
            const usePercent = false;
            const result = processDocs(toArray(processedRowObjects), dataSet, 'gallery', dataSet.fe_views.views.gallery, options, usePercent);
            expect(result).toMatchSnapshot();
        });
    });
});
