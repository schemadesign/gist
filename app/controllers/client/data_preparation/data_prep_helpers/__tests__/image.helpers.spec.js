import {
    checkConditionAndApplyClasses,
    galleryItemHtmlWhenMissingImage,
    retrieveImageURLFromDoc,
    nestedImagePath,
} from '../image.helpers';


describe('image helpers', () => {
    let conditions;

    beforeEach(() => {
        conditions = [{
            value: 'one',
            applyIconFromUrl: '/sample',
        }, {
            value: 'two',
            applyClass: 'sample-class',
        }];
    });

    describe('checkConditionAndApplyClasses', () => {
        it('should return empty string when value is empty', () => {
            const result = checkConditionAndApplyClasses();
            expect(result).toBe('');
        });

        it('should return image', () => {
            const result = checkConditionAndApplyClasses('glitter', conditions, 'one');
            expect(result).toBe('<div class="gist-icon-tile-wrapper"><img class="gist-icon-tile" src="https://arraystesting.nyc3.digitaloceanspaces.com/glitter/sample" alt="Image of one"></div>');
        });

        it('should return class', () => {
            const result = checkConditionAndApplyClasses('glitter', conditions, 'two');
            expect(result).toBe('<span class="gist-icon-tile sample-class color-gender"></span>');
        });
    });

    describe('galleryItemHtmlWhenMissingImage', () => {
        it('should return html for single item', () => {
            const settings = {
                field: 'pikachu',
                conditions,
            };
            const rowParams = {
                [settings.field]: 'one',
            };
            const result = galleryItemHtmlWhenMissingImage(settings, { rowParams }, 'glitter');
            expect(result).toBe('<div class="gist-icon-tile-wrapper"><img class="gist-icon-tile" src="https://arraystesting.nyc3.digitaloceanspaces.com/glitter/sample" alt="Image of one"></div>');
        });

        it('should return html for multi item', () => {
            const settings = {
                field: 'pikachu',
                conditions,
            };
            const rowParams = {
                [settings.field]: ['one', 'two'],
            };
            const result = galleryItemHtmlWhenMissingImage(settings, { rowParams }, 'glitter');
            expect(result).toBe('<div class="gist-icon-tile-wrapper"><img class="gist-icon-tile" src="https://arraystesting.nyc3.digitaloceanspaces.com/glitter/sample" alt="Image of one"></div>');
        });

        it('should return html for only one item', () => {
            const settings = {
                field: 'pikachu',
                conditions,
            };
            const rowParams = {
                [settings.field]: ['two', 'two', 'two', 'two', 'two'],
            };
            const result = galleryItemHtmlWhenMissingImage(settings, { rowParams }, 'glitter');
            expect(result).toBe('<span class="gist-icon-tile sample-class color-gender"></span>');
        });
    });

    describe('retrieveImageURLFromDoc', () => {
        it('should return url', () => {
            const result = retrieveImageURLFromDoc('one', 'glitter', 1, 2, 'gallery', '2017');
            expect(result).toBe('http://local.arrays.co/api/s3/glitter/datasets/2/assets/images/gallery/1?updatedAt=2017');
        });
    });

    describe('nestedImagePath', () => {
        it('should return nested value', () => {
            const rowParams = {
                first: 'a',
                second: 'b',
                third: 'c',
            };
            const fe_image = { field: 'second.third' };
            const result = nestedImagePath({ rowParams }, { fe_image });
            expect(result).toBe('b');
        });
    });
});
