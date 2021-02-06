function ContentFieldCtrl($scope) {
    const contentFieldCtrl = this;
    const { datasetOneCtrl } = $scope.$parent;

    contentFieldCtrl.validateField = validateField;
    contentFieldCtrl.objectTitle = datasetOneCtrl.dataset.objectTitle;

    function validateField(field, fieldValue) {
        if (field.operation === 'ToPercent') {
            const percentRegex = /^\d+(?:\.\d+)?%$/;
            setValidity(percentRegex.test(fieldValue), field.name);
        } else if (field.operation === 'ToDate') {
            const dateValid = validateDate(fieldValue, field.input_format);
            setValidity(dateValid, field.name);
        } else {
            setValidity(true, field.name);
        }
    }

    function setValidity(isValid, field) {
        contentFieldCtrl.form[field].$setValidity('pattern', isValid);
    }

    function validateDate(date, format) {
        let inputFormat = format;

        if (inputFormat === 'ISO_8601') {
            inputFormat = moment.ISO_8601;
        } else if (inputFormat === 'RFC_2822') {
            inputFormat = moment.RFC_2822;
        } else if (inputFormat === 'QQYYYY') {
            inputFormat = 'Q[Q]YYYY';
        }

        return moment(date, inputFormat, true).isValid();
    }
}

function gistContentField() {
    return {
        templateUrl: 'javascripts/dashboard/routes/dataset/one/content/field/field.template.html',
        bindings: {
            field: '<',
            data: '=',
        },
        controllerAs: 'contentFieldCtrl',
        controller: ContentFieldCtrl,
    };
}

angular.module('arraysApp')
    .component('gistContentField', gistContentField());
