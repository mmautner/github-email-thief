var app = angular.module('ghjobs', [
  'ui.router',
  'ngResource',
  'angular-google-gapi'
]);

app.constant('BaseGHUrl', 'https://api.github.com');
app.constant('GmailScope', 'https://mail.google.com/');
app.constant('GoogleClientId', __env.GOOGLE_CLIENT_ID);

app.config(['$stateProvider', '$urlRouterProvider',
  function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise("/");
    $stateProvider
      .state('base', {
        abstract: true,
        templateUrl: '/views/base.html',
        controller: 'BaseCtrl'
      })
      .state('home', {
        url: "/",
        parent: 'base',
        templateUrl: "views/home.html",
        controller: "HomeCtrl"
      })
      .state('inbox', {
        url: '/inbox',
        parent: 'base',
        templateUrl: "views/inbox.html",
        controller: "InboxCtrl"
      })
      .state('terms', {
        url: "/terms",
        parent: 'base',
        templateUrl: "views/terms.html"
      })
      .state('orgs', {
        url: "/org",
        parent: 'base',
        templateUrl: "views/org.html",
        controller: "OrgCtrl"
      })
      .state('org', {
        url: "/org/:org",
        parent: 'base',
        templateUrl: "views/org-detail.html",
        controller: "OrgDetailCtrl"
      })
      .state('repos', {
        url: "/repos",
        parent: 'base',
        templateUrl: "views/repos.html",
        controller: "RepoCtrl"
      })
      .state('events', {
        url: "/events",
        parent: 'base',
        templateUrl: "views/events.html",
        controller: "EventCtrl"
      });
  }
]);


/** services **/
app.service('Orgs', ['$resource', 'BaseGHUrl', function($resource, BaseGHUrl) {
  return $resource(BaseGHUrl + '/organizations');
}]);
app.service('Org', ['$resource', 'BaseGHUrl', function($resource, BaseGHUrl) {
  return $resource(BaseGHUrl + '/orgs/:org');
}]);
app.service('Repo', ['$resource', 'BaseGHUrl', function($resource, BaseGHUrl) {
  return $resource(BaseGHUrl + '/search/repositories');
}]);
app.service('Event', ['$resource', 'BaseGHUrl', function($resource, BaseGHUrl) {
  return $resource(BaseGHUrl + '/events');
}]);
app.service('Commit', ['$resource', 'BaseGHUrl', function($resource, BaseGHUrl) {
  return $resource(BaseGHUrl + '/repos/:owner/:repo/commits/:sha');
}]);


/** controllers **/
app.controller('BaseCtrl', ['GAuth', 'GApi', '$rootScope', '$state',
  function(GAuth, GApi, $rootScope, $state) {

  GAuth.checkAuth().then(function () {
    $rootScope.isLoggedIn = true;
  }, function() {
    $rootScope.isLoggedIn = false;
  });

  $rootScope.signOut = function() {
    GAuth.logout().then(function() {
      $rootScope.isLoggedIn = false;
      $state.go('home');
    });
  };

  $rootScope.doSignup = function() {
    GAuth.login().then(function(){
      $state.go('inbox');
    }, function() {
      console.log('login fail');
    });
  };

}]);
app.controller('HomeCtrl', ['$scope', '$state', 'GAuth', function($scope, $state, GAuth) {
}]);
app.controller('OrgCtrl', ['$scope', '$stateParams', 'Orgs',
  function($scope, $stateParams, Orgs) {
  $scope.orgs = Orgs.query();
}]);
app.controller('OrgDetailCtrl', ['$scope', '$stateParams', 'Org',
  function($scope, $stateParams, Org) {

  $scope.org = Org.get({org: $stateParams.org});
}]);
app.controller('RepoCtrl', ['$scope', '$stateParams', 'Repo',
  function($scope, $stateParams, Repo) {
  $scope.repos = Repo.get({q: "language=python"});
}]);
app.controller('EventCtrl', ['$scope', '$stateParams', 'Event',
  function($scope, $stateParams, Event) {
  $scope.events = Event.query();
}]);
app.controller('InboxCtrl', ['$scope', '$stateParams', 'GApi',
  function($scope, $stateParams, GApi) {

  GApi.executeAuth('gmail', 'users.threads.list', {userId: 'me'})
  .then(function(resp) {
    $scope.response = resp;
  }, function(data) {
    console.log("error :(");
    $scope.response = data;
  });

}]);

app.run(['GAuth', 'GApi', 'GmailScope', 'GoogleClientId', '$state', '$rootScope',
  function(GAuth, GApi, GmailScope, GoogleClientId, $state, $rootScope) {

  GApi.load('gmail', 'v1');
  GAuth.setScope(GmailScope);
  GAuth.setClient(GoogleClientId);
  GAuth.checkAuth().then(function () {
    $rootScope.isLoggedIn = true;
    $state.go('inbox');
  }, function() {
    $rootScope.isLoggedIn = false;
    $state.go('home');
  });
}]);
