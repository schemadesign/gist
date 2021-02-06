import { intuitDatatype, fieldDataType_coercion_toString, verifyDataType, isDate } from '../datatypes';

describe('Intuit datatypes', () => {
    describe('Integer and floats', () => {

        it('should parse number', () => {
            const datatype = intuitDatatype('name', '100');
            expect(datatype.data_type).toBe('Number');
            expect(datatype.operation).toBe('ToInteger');
        });

        it('should parse float', () => {
            const datatype = intuitDatatype('name', '100.0');
            expect(datatype.data_type).toBe('Number');
            expect(datatype.operation).toBe('ToFloat');
        });

        it('should parse negative number', () => {
            const datatype = intuitDatatype('name', '-100');
            expect(datatype.data_type).toBe('Number');
            expect(datatype.operation).toBe('ToInteger');
        });

        it('should parse negative float', () => {
            const datatype = intuitDatatype('name', '-100.0');
            expect(datatype.data_type).toBe('Number');
            expect(datatype.operation).toBe('ToFloat');
        });

        it('should parse number with commas', () => {
            const datatype = intuitDatatype('name', '100,000,000');
            expect(datatype.data_type).toBe('Number');
            expect(datatype.operation).toBe('ToInteger');
        });

        it('should parse negative number with commas', () => {
            const datatype = intuitDatatype('name', '-100,000,000');
            expect(datatype.data_type).toBe('Number');
            expect(datatype.operation).toBe('ToInteger');
        });

        it('should parse negative float with commas', () => {
            const datatype = intuitDatatype('name', '100,000,000.234');
            expect(datatype.data_type).toBe('Number');
            expect(datatype.operation).toBe('ToFloat');
        });

        it('should parse "-" as a string', () => {
            const datatype = intuitDatatype('name', '-');
            expect(datatype.data_type).toBe('Text');
            expect(datatype.operation).toBe('ToString');
        });
    });

    describe('Percentage', () => {
        it('should parse percentage at the end of number', () => {
            const datatype = intuitDatatype('name', '100%');
            expect(datatype.data_type).toBe('Number');
            expect(datatype.operation).toBe('ToPercent');
        });

        it('should parse string %100 as a string', () => {
            const datatype = intuitDatatype('name', '%100');
            expect(datatype.data_type).toBe('Text');
            expect(datatype.operation).toBe('ToString');
        });

        it('should parse % as a string', () => {
            const datatype = intuitDatatype('name', '%');
            expect(datatype.data_type).toBe('Text');
            expect(datatype.operation).toBe('ToString');
        });

        it('should parse float percentage as a float', () => {
            const datatype = intuitDatatype('name', '0.2%');
            expect(datatype.data_type).toBe('Number');
            expect(datatype.operation).toBe('ToPercent');
        });
    });

    describe('Date', () => {
        [
            '2016-02-03', '2016-09-21', '2016-01-01', '2016-02-02 15:00', '2016-10-08 06:00', '2016/02/03', '2017/02/01',
            'January 2018', 'Jan 2018', 'January 1, 2018', 'Jan 1, 2018', 'Jan-18', '10-2019', '3.20.2014',

        ].forEach(val => {
            it(`should parse date ${val}`, () => {
                const res = intuitDatatype('name', val);
                expect(res.data_type).toBe('Date');
                expect(res).toMatchSnapshot();
            });
        });
    });

    describe('Currency', () => {
        it('should parse currency value', () => {
            const datatype = intuitDatatype('name', '123 GBP');
            expect(datatype.data_type).toBe('Number');
            expect(datatype.operation).toBe('ToCurrency');
            expect(datatype.currency).toBe('GBP');
        });

        it('should set currency before symbol €', () => {
            const datatype = intuitDatatype('name', '€ 123 EUR');
            expect(datatype.data_type).toBe('Number');
            expect(datatype.operation).toBe('ToCurrency');
            expect(datatype.currency).toBe('EUR');
        });

        it('should save currency symbol', () => {
            const datatype = intuitDatatype('name', '€ 123');
            expect(datatype.data_type).toBe('Number');
            expect(datatype.operation).toBe('ToCurrency');
            expect(datatype.currency).toBe('€');
        });
    });

    describe('String', () => {
        ['IAmString1', 'AM1', '1am', 'xyz', 'XYz%'].forEach(val => {
            it(`should recognized ${val} as a string`, () => {
                const datatype = intuitDatatype('name', val);
                expect(datatype.data_type).toBe('Text');
                expect(datatype.operation).toBe('ToString');
            });
        });
    });
});

describe('Misc helpers', () => {
    describe('fieldDataType_coercion_toString', () => {
        [
            { op: 'ProxyExisting', expect: 'Proxy' },
            { op: 'ToDate', expect: 'Date' },
            { op: 'ToInteger', expect: 'Integer' },
            { op: 'ToFloat', expect: 'Float' },
            { op: 'ToPercent', expect: 'Percent' },
            { op: 'ToStringTrim', expect: 'String Trim' },
            { op: 'Unknown', expect: 'String' }
        ].forEach(val => {
            it(`should return ${val.expect} from operation ${val.op}`, () => {
                expect(fieldDataType_coercion_toString({ operation: val.op })).toBe(val.expect);
            });
        });

        it('should return String when field is null', () => {
            expect(fieldDataType_coercion_toString()).toBe('String');
        });
    });

    describe('verifyDataType', () => {
        it('should keep date format', () => {
            const rowObject = { operation: 'ToDate', input_format: 'YYYY-MM-DD', data_type: 'Date' };
            const ret = verifyDataType('name', '2018-06-01', rowObject);
            expect(ret).toBe(rowObject);
        });

        it('should change from date to integer data_type', () => {
            const ret = verifyDataType('name', '100', {
                operation: 'ToDate',
                input_format: 'YYYY-MM-DD',
                data_type: 'Date'
            });
            expect(ret.data_type).toBe('Number');
            expect(ret.operation).toBe('ToInteger');
        });

        it('should keep integer', () => {
            const rowObject = { operation: 'ToInteger', data_type: 'Number' };
            const ret = verifyDataType('name', '100', rowObject);
            expect(ret).toBe(rowObject);
        });

        it('should change integer to float', () => {
            const rowObject = { operation: 'ToInteger', data_type: 'Number' };
            const ret = verifyDataType('name', '100.0', rowObject);
            expect(ret.data_type).toBe('Number');
            expect(ret.operation).toBe('ToFloat');
        });
    });
});

describe('isDate', () => {
    it('D-MMM-YY is valid', () => {
        expect(isDate('1-jan-10', 'D-MMM-YY')).toEqual([true, 'D-MMM-YY']);
    });

    it('YYYY/MM/DD is valid', () => {
        expect(isDate('2010/12/23', 'YYYY/MM/DD')).toEqual([true, 'YYYY/MM/DD']);
    });

    it('MM/DD/YYYY is valid', () => {
        expect(isDate('10/12/2010')).toEqual([true, 'MM/DD/YYYY']);
    });

    it('empty is not valid', () => {
        expect(isDate('')).toEqual([false, null]);
    });
});
