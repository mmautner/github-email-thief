var app = angular.module('github-email-thief', [
  'ui.router',
  'ui.bootstrap',
  'ngResource',
  'ngSanitize',
  'LocalStorageModule',
  'angular-growl',
  'ngCsv'
]);

app.constant('BaseGHUrl', 'https://api.github.com');
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
        url: "/search/?language&page&searchType",
        parent: 'base',
        templateUrl: "views/search.html",
        controller: "SearchCtrl"
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
  return $resource(BaseGHUrl + '/search/repositories',
    {},
    {
      get: {
        method: 'GET',
        transformResponse: function(data, headers){
            response = {}
            response.data = angular.fromJson(data);
            response.headers = headers();
            return response;
        }
      }
    });
}]);
app.service('CodeSearch', ['$resource', 'BaseGHUrl', function($resource, BaseGHUrl) {
  return $resource(BaseGHUrl + '/search/code');
}]);
app.service('UserSearch', ['$resource', 'BaseGHUrl', function($resource, BaseGHUrl) {
  return $resource(BaseGHUrl + '/search/users');
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
app.service('range', function() {
  // http://stackoverflow.com/a/8273091/468653
  return function(start, stop, step) {
    if (typeof stop == 'undefined') {
      stop = start;
      start = 0;
    }
    if (typeof step == 'undefined') {
      step = 1;
    }
    if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
      return [];
    }
    var result = [];
    for (var i = start; step > 0 ? i < stop : i > stop; i += step) {
      result.push(i);
    }
    return result;
  };
});


/** controllers **/
app.controller('BaseCtrl', [function() { }]);
app.controller('HomeCtrl', ['$scope', '$state', 'PopularLanguages', 'RepoSearch',
  function($scope, $state, PopularLanguages, RepoSearch) {

  $scope.languages = PopularLanguages;
  $scope.goToSearch = function(lang) {
    $state.go('search', {
      searchType: 'repos',
      page: 1,
      language: lang
    });
  };
}]);
app.controller('SearchCtrl', [
  '$scope', '$state', '$stateParams', 'PopularLanguages', 'RepoSearch', 'CodeSearch', 'UserSearch', 'Repo', '$modal', 'Bookmark', 'growl', 'range',
  function($scope, $state, $stateParams, PopularLanguages, RepoSearch, CodeSearch, UserSearch, Repo, $modal, Bookmark, growl, range) {
  
  $scope.languages = PopularLanguages;
  $scope.formData = {
    selectedLanguage: $stateParams.language,
    page: parseInt($stateParams.page),
    searchType: $stateParams.searchType
  };

  $scope.range = range;

  $scope.newSearch = function() {
    $state.go('search', {
      language: $scope.formData.selectedLanguage,
      page: 1,
      searchType: $scope.formData.searchType
    });
  };

  $scope.refreshSearch = function(clearPageNumber) {
    console.log('refreshing search');

    // construct query string
    var qry = [];
    if ($scope.formData.selectedLanguage) {
      qry.push("language="+$scope.formData.selectedLanguage);
    }
    if ($scope.formData.searchQry) {
      qry.push($scope.formData.searchQry);
    }
    qry = qry.join('+');

    var searchService;
    switch ($scope.formData.searchType) {
      case 'repos':
        searchService = RepoSearch;
        break;
      case 'codes':
        searchService = CodeSearch;
        break;
      case 'users':
        searchService = UserSearch;
        break;
      default:
        searchService = RepoSearch;
    }

    var qryArgs = {
      q: qry
    };
    if ($stateParams.page) {
      qryArgs.page = $stateParams.page;
    }
    searchService.get(qryArgs, function(response) {
      $scope.data = response.data;
      $scope.headers = response.headers;
      var maxResults = Math.min($scope.data.total_count, 1000);
      $scope.numOfPages = Math.ceil(maxResults/$scope.data.items.length);
    });
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

app.run([function() {
  FastClick.attach(document.body);
}]);
