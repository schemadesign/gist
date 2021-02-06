import { transform } from 'lodash';

import { aggregateCoordPoints, projectDetailFields } from '../coord_aggregation_helpers';
import { pokemonV2 } from '../../../../../../internals/testing/backend/fixtures/datasets';


describe('Coord Aggregation Helpers ', () => {
    let dataSourceDescription;
    let projectionObject;
    let options;
    let latField = 'Pokemon No_';
    let lngField = 'Max CP';

    beforeEach(async () => {
        // Reset these fields before each test
        dataSourceDescription = pokemonV2;
        projectionObject = {};
        options = {
            aggregateBy_realColumnName: 'Max HP',
        };
    });

    it('should add aggregation query for title & lat/lng coords', () => {
        projectionObject = aggregateCoordPoints(projectionObject, dataSourceDescription.objectTitle, options, latField, lngField, options);
        expect(projectionObject).toHaveProperty('coordTitle');
        expect(projectionObject).toHaveProperty('lngField');
        expect(projectionObject).toHaveProperty('latField');
    });

    it('should not add detail fields which are flagged as excluded', () => {
        dataSourceDescription.fe_excludeFieldsObjDetail = transform(dataSourceDescription.fe_excludeFieldsObjDetail, (result, value, key) => {
            result[key] = true;
        });
        projectionObject = aggregateCoordPoints(projectionObject, dataSourceDescription.objectTitle, options, latField, lngField);
        projectionObject = projectDetailFields(projectionObject, dataSourceDescription.fe_excludeFieldsObjDetail, dataSourceDescription.fe_fieldDisplayOrder);

        dataSourceDescription.fe_fieldDisplayOrder.forEach(field => {
            expect(projectionObject).hasOwnProperty('__detail__' + field);
        });
    });

    it('should add detail fields with respect to the field display order', () => {
        // make sure field exclusion doesn't interfere with field inclusion
        dataSourceDescription.fe_excludeFieldsObjDetail = transform(dataSourceDescription.fe_excludeFieldsObjDetail, (result, value, key) => {
            result[key] = false;
        });

        dataSourceDescription.fe_fieldDisplayOrder.reverse();
        projectionObject = aggregateCoordPoints(projectionObject, dataSourceDescription.objectTitle, options, latField, lngField);
        projectionObject = projectDetailFields(projectionObject, dataSourceDescription.fe_excludeFieldsObjDetail, dataSourceDescription.fe_fieldDisplayOrder);

        expect(projectionObject).toHaveProperty('__detail__' + dataSourceDescription.fe_fieldDisplayOrder[0]);
        expect(projectionObject).toHaveProperty('__detail__' + dataSourceDescription.fe_fieldDisplayOrder[1]);
        expect(projectionObject).toHaveProperty('__detail__' + dataSourceDescription.fe_fieldDisplayOrder[2]);
    });
});
