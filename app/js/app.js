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
        templateUrl: '/views/base.html'
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
        url: "/org/:org",
        parent: 'base',
        templateUrl: "views/org.html",
        controller: "OrgCtrl"
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

app.controller('HomeCtrl', ['$scope', '$state', 'GAuth', function($scope, $state, GAuth) {
  $scope.doSignup = function() {
    GAuth.login().then(function(){
      $state.go('inbox');
    }, function() {
      console.log('login fail');
    });
  };
}]);
app.controller('OrgCtrl', ['$scope', '$stateParams', 'Orgs',
  function($scope, $stateParams, Orgs) {
  $scope.orgs = Orgs.query();
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
    console.log(resp);
    $scope.response = resp;
  }, function(data) {
    console.log("error :(");
    $scope.response = data;
  });

}]);

app.run(['GAuth', 'GApi', 'GmailScope', 'GoogleClientId', '$state',
  function(GAuth, GApi, GmailScope, GoogleClientId, $state) {

  GApi.load('gmail', 'v1');
  GAuth.setScope(GmailScope);
  GAuth.setClient(GoogleClientId);
  GAuth.checkAuth().then(function () {
    $state.go('inbox');
  }, function() {
    $state.go('home');
  });
}]);
