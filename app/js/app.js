var app = angular.module('scriptermail', [
  'ui.router',
  'ui.bootstrap',
  'ngResource',
  'ngSanitize',
  'angular-google-gapi',
  'LocalStorageModule',
  'angular-growl',
  'ngCsv'
]);

app.constant('BaseGHUrl', 'https://api.github.com');
app.constant('GmailScope', 'https://mail.google.com/');
app.constant('GoogleClientId', __env.GOOGLE_CLIENT_ID);
app.constant('PopularLanguages', [
  'JavaScript',
  'Python',
  'Java',
  'Ruby',
  'Scala',
  'Swift',
  'Objective-C',
  'C',
  'PHP',
  'C#',
  'Go',
  'C++',
  'Clojure',
  'CoffeeScript',
  'CSS',
  'Haskell',
  'HTML',
  'Lua',
  'Matlab',
  'Perl',
  'R',
  'Shell',
  'TeX',
  'VimL',
]);

app.config(['$locationProvider', function($locationProvider) {
  $locationProvider.html5Mode(true);
}]);

app.config(['growlProvider', function(growlProvider) {
  growlProvider.globalTimeToLive({
    success: 1000,
    error: 2000,
    warning: 3000,
    info: 4000
  });
  growlProvider.globalDisableIcons(true);
}]);

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
      .state('search', {
        url: "/search/:language",
        parent: 'base',
        templateUrl: "views/search.html",
        controller: "SearchCtrl"
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
      .state('bookmarks', {
        url: "/bookmarks",
        parent: 'base',
        templateUrl: "views/bookmarks.html",
        controller: "BookmarksCtrl"
      });
  }
]);


/** services **/
app.service('RepoSearch', ['$resource', 'BaseGHUrl', function($resource, BaseGHUrl) {
  return $resource(BaseGHUrl + '/search/repositories');
}]);
app.service('Repo', ['$resource', 'BaseGHUrl', function($resource, BaseGHUrl) {
  return $resource(BaseGHUrl + '/repos/:owner/:repo/:commits');
}]);
app.service('Commit', ['$resource', 'BaseGHUrl', function($resource, BaseGHUrl) {
  return $resource(BaseGHUrl + '/repos/:owner/:repo/commits/:sha');
}]);

app.service('Bookmark', ['localStorageService', function(localStorage) {
  var userBookmarksKey = 'bookmarkedUsers';

  var addBookmark = function(data) {
    var bookmarks = localStorage.get(userBookmarksKey);
    if (!bookmarks) {
      bookmarks = '{}';
    }
    bookmarks = angular.fromJson(bookmarks);
    bookmarks[data.email] = data;

    var newBookmarks = angular.toJson(bookmarks);
    localStorage.set(userBookmarksKey, newBookmarks);
    return data;
  };
  var getBookmarks = function() {
    var bookmarks = localStorage.get(userBookmarksKey);
    if (!bookmarks) {
      bookmarks = '{}';
    }
    return angular.fromJson(bookmarks);
  };
  return {
    addBookmark: addBookmark,
    getBookmarks: getBookmarks
  }
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
app.controller('HomeCtrl', ['$scope', '$state', 'PopularLanguages', 'RepoSearch',
  function($scope, $state, PopularLanguages, RepoSearch) {

  $scope.languages = PopularLanguages;
  $scope.goToSearch = function(lang) {
    $state.go('search', {language: lang});
  };
}]);
app.controller('SearchCtrl', [
  '$scope', '$state', '$stateParams', 'PopularLanguages', 'RepoSearch', 'Repo', '$modal', 'Bookmark', 'growl',
  function($scope, $state, $stateParams, PopularLanguages, RepoSearch, Repo, $modal, Bookmark, growl) {
  
  $scope.languages = PopularLanguages;
  $scope.selectedLanguage = $stateParams.language;

  $scope.refreshSearch = function() {
    $scope.loaded = false;
    $scope.dynamic = 0;
    RepoSearch.get({q: "language="+$scope.selectedLanguage}, function(data) {
      $scope.loaded = true;
      $scope.items = data.items;
    });
    // increment progress bar 19% every .5s, stopping at <100
    $scope.dynamic = 10;
  };

  $scope.refreshSearch();

  var uniqueEmails = function(results) {
    var s = new Set();
    for (var i = 0; i < results.length; i++) {
      var login = results[i].committer ? results[i].committer.login : null;
      var name = results[i].commit.committer ? results[i].commit.committer.name : null;
      var email = results[i].commit.committer ? results[i].commit.committer.email : null;
      s.add(JSON.stringify({
        login: login,
        name: name,
        email: email
      }));
    }
    var x = [];
    for (item of s) {
      x.push(JSON.parse(item));
    };
    return x;
  };

  $scope.searchEmail = function(owner, repo) {
    Repo.query({owner: owner, repo: repo, commits: 'commits'}, function(data) {
      $scope.authors = uniqueEmails(data);
      $modal.open({
        scope: $scope,
        show: true,
        size: 'lg',
        windowClass: 'app-modal-window',
        templateUrl: 'views/result-modal.html'
      });
    });
  };

  $scope.bookmarkUser = function(data) {
    Bookmark.addBookmark(data);
    growl.success('Bookmarked!');
  };
}]);

app.controller('BookmarksCtrl', ['$scope', '$stateParams', 'Bookmark',
  function($scope, $stateParams, Bookmark) {

  $scope.getArray = function() {
    var log = [];
    angular.forEach(Bookmark.getBookmarks(), function(value, key) {
      this.push(value);
    }, log);
    return log;
  };
  $scope.bookmarks = Bookmark.getBookmarks();
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
  /*
  GAuth.checkAuth().then(function () {
    $rootScope.isLoggedIn = true;
    $state.go('inbox');
  }, function() {
    $rootScope.isLoggedIn = false;
    $state.go('home');
  });
  */

  FastClick.attach(document.body);
}]);
