const { flatten } = require('../flatten-helpers');

describe('Flatten Helpers', () => {
    it('should flat the array of objects', () => {
        const val = flatten([{ a: 1, b: 2 }, { a: 3, b: 4 }]);
        expect(val).toMatchSnapshot();
    });

    it('should flat the internal array', () => {
        const val = flatten({ year: 2018, month: 2, law: [{ a: 1, b: 2 }, { a: 3, b: 4 }] });
        expect(val).toEqual([
            { year: 2018, month: 2, 'law.a': 1, 'law.b': 2 },
            { year: 2018, month: 2, 'law.a': 3, 'law.b': 4 },
        ]);
    });

    it('should flat complex nested object', () => {
        const val = flatten({
            year: 2000,
            ppl: [
                { name: 'John', city: 'NYC' },
                { name: 'Edit', city: 'Boston', age: 78, res: [{ a: 3 }, { a: 7, b: 2 }, { c: 9, b: 10 }] },
                { name: 'Gad', city: 'Poz', res: { all: { b: 100 } } },
                { name: 'Gad', city: 'Poz', res: { all: { b: 100 }, null: 2, nu: { e: { f: { g: 1000 } } } } },
                { name: 'Ed', age: 100, res: [{ a: 1 }, { a: 8, b: 2 }] },
            ],
        });
        expect(val).toEqual([
            {
                year: 2000,
                'ppl.name': 'John',
                'ppl.city': 'NYC',
                'ppl.age': '',
                'ppl.res.a': '',
                'ppl.res.b': '',
                'ppl.res.c': '',
                'ppl.res.all.b': '',
                'ppl.res.null': '',
                'ppl.res.nu.e.f.g': '',
            }, {
                year: 2000,
                'ppl.name': 'Edit',
                'ppl.city': 'Boston',
                'ppl.age': 78,
                'ppl.res.a': 3,
                'ppl.res.b': '',
                'ppl.res.c': '',
                'ppl.res.all.b': '',
                'ppl.res.null': '',
                'ppl.res.nu.e.f.g': '',
            }, {
                year: 2000,
                'ppl.name': 'Edit',
                'ppl.city': 'Boston',
                'ppl.age': 78,
                'ppl.res.a': 7,
                'ppl.res.b': 2,
                'ppl.res.c': '',
                'ppl.res.all.b': '',
                'ppl.res.null': '',
                'ppl.res.nu.e.f.g': '',
            }, {
                year: 2000,
                'ppl.name': 'Edit',
                'ppl.city': 'Boston',
                'ppl.age': 78,
                'ppl.res.c': 9,
                'ppl.res.b': 10,
                'ppl.res.a': '',
                'ppl.res.all.b': '',
                'ppl.res.null': '',
                'ppl.res.nu.e.f.g': '',
            }, {
                year: 2000,
                'ppl.name': 'Gad',
                'ppl.city': 'Poz',
                'ppl.res.all.b': 100,
                'ppl.age': '',
                'ppl.res.a': '',
                'ppl.res.b': '',
                'ppl.res.c': '',
                'ppl.res.null': '',
                'ppl.res.nu.e.f.g': '',
            }, {
                year: 2000,
                'ppl.name': 'Gad',
                'ppl.city': 'Poz',
                'ppl.res.all.b': 100,
                'ppl.res.null': 2,
                'ppl.res.nu.e.f.g': 1000,
                'ppl.age': '',
                'ppl.res.a': '',
                'ppl.res.b': '',
                'ppl.res.c': '',
            }, {
                year: 2000,
                'ppl.name': 'Ed',
                'ppl.age': 100,
                'ppl.res.a': 1,
                'ppl.city': '',
                'ppl.res.b': '',
                'ppl.res.c': '',
                'ppl.res.all.b': '',
                'ppl.res.null': '',
                'ppl.res.nu.e.f.g': '',
            }, {
                year: 2000,
                'ppl.name': 'Ed',
                'ppl.age': 100,
                'ppl.res.a': 8,
                'ppl.res.b': 2,
                'ppl.city': '',
                'ppl.res.c': '',
                'ppl.res.all.b': '',
                'ppl.res.null': '',
                'ppl.res.nu.e.f.g': '',
            },
        ]);
    });
});
