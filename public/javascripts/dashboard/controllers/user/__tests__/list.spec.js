import '../list';

function filter(inputArr, searchTerm) {
	return inputArr.filter(function(arrayElement) {
	  return arrayElement.url.match(searchTerm);
	});
}

describe('User service(list.js)', () => {
	let $scope,
		$rootScope,
		$state,
		$controller,
		User,
		$user,
		AuthService,
		$mdDialog, 
		Team, 
		$window, 
		$location,
		$userCopy;
	let $mdToast = {};
	let injectValues,
		ctrl;

    beforeEach(() => {
        angular.mock.module('arraysApp');
		inject((_$controller_, _$rootScope_, _$state_) => {
			$controller = _$controller_;
            $rootScope = _$rootScope_;
            $state = _$state_;
		});
		$scope = $rootScope.$new();
		$scope.users = { $promise: {then: jest.fn()} };
		$scope.datasets = null;
		$scope.primaryAction = {};
		$scope.dashboardCtrl = null;
		$scope.updateUserRolesOnTeam = jest.fn();

		injectValues = {
            $scope,
            $mdToast,
            AuthService: {
                reload: jest.fn(),
                currentUser: jest.fn().mockReturnValue({ defaultLoginTeam: {} }),
                allTeams: jest.fn(),
                currentTeam: jest.fn().mockReturnValue({}),
            },
			User,
			$mdDialog,
			Team,
			$window,
			$location,
		};
		ctrl = $controller('BaseUserListCtrl', injectValues);
	});


	it('test updateFilterUser empty string', function(){
		var testFilter = $scope.updateFilterUser("");
		expect(testFilter).not.toBeNull();
	});
});
