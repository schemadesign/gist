import { determineClickThroughView } from '../view.helpers';
import { kebabCase, camelCase } from 'lodash';

import {
    VIEW_TYPE_BUBBLE_CHART,
    VIEW_TYPE_GALLERY,
    VIEW_TYPE_MAP,
    VIEW_TYPE_SCATTERPLOT,
    VIEW_TYPE_TABLE,
    VIEW_TYPE_TIMELINE,
} from '../../../config/views.config';


describe('view helpers', () => {
    describe('determineClickThroughView', () => {
        it('should return gallery when visible', () => {
            const viewSettings = {
                [VIEW_TYPE_GALLERY]: { visible: true },
            };

            expect(determineClickThroughView('', viewSettings)).toBe(kebabCase(VIEW_TYPE_GALLERY));
        });

        it('should return timeline when visible', () => {
            const viewSettings = {
                [VIEW_TYPE_GALLERY]: { visible: false },
                [VIEW_TYPE_TIMELINE]: { visible: true },
            };

            expect(determineClickThroughView('', viewSettings)).toBe(kebabCase(VIEW_TYPE_TIMELINE));
        });

        it('should return scatterplot when visible', () => {
            const viewSettings = {
                [VIEW_TYPE_GALLERY]: { visible: false },
                [VIEW_TYPE_SCATTERPLOT]: { visible: true },
            };

            expect(determineClickThroughView('', viewSettings)).toBe(kebabCase(VIEW_TYPE_SCATTERPLOT));
        });

        it('should return map when visible', () => {
            const viewSettings = {
                [VIEW_TYPE_GALLERY]: { visible: false },
                [VIEW_TYPE_MAP]: { visible: true },
            };

            expect(determineClickThroughView('', viewSettings)).toBe(kebabCase(VIEW_TYPE_MAP));
        });

        it('should return bubble chart when visible', () => {
            const viewSettings = {
                [VIEW_TYPE_GALLERY]: { visible: false },
                [camelCase(VIEW_TYPE_BUBBLE_CHART)]: { visible: true },
            };

            expect(determineClickThroughView('', viewSettings)).toBe(kebabCase(VIEW_TYPE_BUBBLE_CHART));
        });

        it('should return table when visible', () => {
            const viewSettings = {
                [VIEW_TYPE_GALLERY]: { visible: false },
                [VIEW_TYPE_TABLE]: { visible: true },
            };

            expect(determineClickThroughView('', viewSettings)).toBe(kebabCase(VIEW_TYPE_TABLE));
        });

        it('should return current view when none is visible', () => {
            const viewSettings = {
                [VIEW_TYPE_GALLERY]: { visible: false },
                [camelCase(VIEW_TYPE_BUBBLE_CHART)]: { visible: false },
            };

            expect(determineClickThroughView(VIEW_TYPE_TABLE, viewSettings)).toBe(VIEW_TYPE_TABLE);
        });

        it('should return another available view when checked one is in use', () => {
            const viewSettings = {
                [VIEW_TYPE_GALLERY]: { visible: true },
                [camelCase(VIEW_TYPE_BUBBLE_CHART)]: { visible: true },
            };

            expect(determineClickThroughView(VIEW_TYPE_GALLERY, viewSettings)).toBe(kebabCase(VIEW_TYPE_BUBBLE_CHART));
            expect(determineClickThroughView(VIEW_TYPE_BUBBLE_CHART, viewSettings)).toBe(kebabCase(VIEW_TYPE_GALLERY));
        });
    });
});
