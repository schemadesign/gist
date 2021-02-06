function ApiKeyCtrl($scope, ApiKey) {
    const apiKeyCtrl = this;
    const { dashboardCtrl } = $scope;

    $scope.$parent.currentNavItem = 'api';

    apiKeyCtrl.generateKey = generateKey;
    apiKeyCtrl.handleApiKeyFormSubmit = handleApiKeyFormSubmit;
    apiKeyCtrl.onAdd = onAdd;
    apiKeyCtrl.onRemove = onRemove;
    apiKeyCtrl.apiKey = {
        showOption: false,
    };

    ApiKey
        .getKey()
        .$promise
        .then(({ key, active, requestDomains }) => {
            apiKeyCtrl.apiKey.showOption = true;
            apiKeyCtrl.apiKey.key = key;
            apiKeyCtrl.apiKey.active = active;
            apiKeyCtrl.apiKey.requestDomains = requestDomains;
        });

    function onAdd(domain) {
        const hostname = arrays.extractHostname(domain);
        apiKeyCtrl.apiKey.requestDomains.pop();
        const isDuplicated = apiKeyCtrl.apiKey.requestDomains.includes(hostname);
        apiKeyCtrl.apiKeyForm.requestDomains.$setValidity('duplicate', !isDuplicated);

        if (isDuplicated) {
            return;
        }

        apiKeyCtrl.apiKey.requestDomains.push(hostname);
    }

    function onRemove() {
        apiKeyCtrl.apiKeyForm.requestDomains.$setValidity('duplicate', true);
    }

    function generateKey() {
        ApiKey
            .generate()
            .$promise
            .then(({ key, active, requestDomains }) => {
                apiKeyCtrl.apiKey.key = key;
                apiKeyCtrl.apiKey.active = active;
                apiKeyCtrl.apiKey.requestDomains = requestDomains;

                dashboardCtrl.showSimpleToast('API key generated.');
            })
            .catch(({ data: { error } }) => dashboardCtrl.showSimpleToast(error));
    }

    function handleApiKeyFormSubmit() {
        const domains = apiKeyCtrl.apiKey.requestDomains;
        if (!domains) {
            return dashboardCtrl.showSimpleToast('At least one domain is required.');
        }

        ApiKey.submit({
            apiKey: apiKeyCtrl.apiKey.key,
            domains,
        })
            .$promise
            .then(({ requestDomains }) => {
                apiKeyCtrl.apiKey.requestDomains = requestDomains;
                dashboardCtrl.showSimpleToast('API Key settings updated.');
            })
            .catch(({ data: { error } }) => {
                dashboardCtrl.showSimpleToast(error);
            });
    }
}

angular.module('arraysApp')
    .controller('ApiKeyCtrl', ApiKeyCtrl);
