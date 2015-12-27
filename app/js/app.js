var app = angular.module('github-email-thief', [
  'ui.router',
  'ui.bootstrap',
  'ngResource',
  'ngSanitize',
  'LocalStorageModule',
  'angular-growl',
  'ngCsv',
  'angulartics',
  'angulartics.google.analytics'
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

app.config(function($locationProvider) {
  $locationProvider.html5Mode(true);
});

// http://stackoverflow.com/a/23087400/468653
app.config(function($httpProvider) {
  $httpProvider.interceptors.push(function($q) {
    var realEncodeURIComponent = window.encodeURIComponent;
    return {
      'request': function(config) {
         window.encodeURIComponent = function(input) {
           return realEncodeURIComponent(input).split("%2B").join("+"); 
         }; 
         return config || $q.when(config);
      },
      'response': function(config) {
         window.encodeURIComponent = realEncodeURIComponent;
         return config || $q.when(config);
      }
    };
  });
});

app.config(function(growlProvider) {
  growlProvider.globalTimeToLive({
    success: 1000,
    error: 2000,
    warning: 3000,
    info: 4000
  });
  growlProvider.globalDisableIcons(true);
});

app.config(function($stateProvider, $urlRouterProvider) {
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
        url: "/search",
        parent: 'base',
        templateUrl: "views/search.html",
        controller: "SearchCtrl"
      })
      .state('search.repos', {
        url: "/repos?language&page&query",
        templateUrl: "views/search_repos.html",
        controller: "SearchReposCtrl"
      })
      .state('search.codes', {
        url: "/codes?language&page&query",
        templateUrl: "views/search_codes.html",
        controller: "SearchCodesCtrl"
      })
      .state('search.users', {
        url: "/users?language&page&query",
        templateUrl: "views/search_users.html",
        controller: "SearchUsersCtrl"
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
);


/** services **/
app.service('RepoSearch', function($resource, BaseGHUrl) {
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
});
app.service('CodeSearch', function($resource, BaseGHUrl) {
  return $resource(BaseGHUrl + '/search/code');
});
app.service('UserSearch', function($resource, BaseGHUrl) {
  return $resource(BaseGHUrl + '/search/users');
});
app.service('UserRepo', function($resource, BaseGHUrl) {
  return $resource(BaseGHUrl + '/users/:owner/repos');
});
app.service('Repo', function($resource, BaseGHUrl) {
  return $resource(BaseGHUrl + '/repos/:owner/:repo/:commits');
});
app.service('Commit', function($resource, BaseGHUrl) {
  return $resource(BaseGHUrl + '/repos/:owner/:repo/commits/:sha');
});

app.service('Bookmark', function(localStorageService) {
  var userBookmarksKey = 'bookmarkedUsers';

  var addBookmark = function(data) {
    var bookmarks = localStorageService.get(userBookmarksKey);
    if (!bookmarks) {
      bookmarks = '{}';
    }
    bookmarks = angular.fromJson(bookmarks);
    bookmarks[data.email] = data;

    var newBookmarks = angular.toJson(bookmarks);
    localStorageService.set(userBookmarksKey, newBookmarks);
    return data;
  };
  var getBookmarks = function() {
    var bookmarks = localStorageService.get(userBookmarksKey);
    if (!bookmarks) {
      bookmarks = '{}';
    }
    return angular.fromJson(bookmarks);
  };
  return {
    addBookmark: addBookmark,
    getBookmarks: getBookmarks
  }
});
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
app.controller('BaseCtrl', function() { });
app.controller('HomeCtrl', function($scope, $state, PopularLanguages) {

  $scope.languages = PopularLanguages;
  $scope.goToSearch = function(lang) {
    $state.go('search.repos', {
      page: 1,
      language: lang
    });
  };
});

app.controller('SearchCtrl', function($scope, $modal, PopularLanguages, Repo, UserRepo, Bookmark, growl) {

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

  $scope.searchEmailByUser = function(owner) {
    UserRepo.query({owner: owner}, function(data) {
      if (data.length) {
        $scope.searchEmail(owner, data[0].name);
      } else {
        growl.error('No repos found for ' + owner);
      };
    });
  };

  $scope.bookmarkUser = function(data) {
    Bookmark.addBookmark(data);
    growl.success('Bookmarked');
  };
});

app.controller('SearchReposCtrl', function($scope, $state, $stateParams, PopularLanguages, RepoSearch, Repo, $modal, range) {
  
  $scope.languages = PopularLanguages;
  $scope.formData = {
    language: $stateParams.language,
    query: $stateParams.query,
    page: parseInt($stateParams.page)
  };
  $scope.range = range;
  $scope.refreshSearch = function() {
    $scope.formData.page = 1;
    $state.go("search.repos", $scope.formData);
  };

  function refresh() {
    var qry = [];
    if ($scope.formData.language) {
      qry.push("language="+$scope.formData.language);
    }
    if ($scope.formData.query) {
      qry.push($scope.formData.query);
    }
    qry = qry.join('+');
    RepoSearch.get({
      q: qry,
      page: $scope.formData.page
    }, function(response) {
      $scope.data = response.data;
      $scope.headers = response.headers;
      var maxResults = Math.min($scope.data.total_count, 1000);
      $scope.numOfPages = Math.ceil(maxResults/$scope.data.items.length);
    });
  };
  refresh();
});

app.controller('SearchCodesCtrl', function($scope, $state, $stateParams, PopularLanguages, CodeSearch, range) {
  $scope.languages = PopularLanguages;
  $scope.formData = {
    language: $stateParams.language,
    query: $stateParams.query,
    page: parseInt($stateParams.page)
  };
  $scope.range = range;
  $scope.refreshSearch = function() {
    $scope.formData.page = 1;
    $state.go("search.codes", $scope.formData);
  };

  function refresh() {
    var qry = [];
    if ($scope.formData.query) {
      qry.push($scope.formData.query);
    }
    qry.push("in:file");
    if ($scope.formData.language) {
      qry.push("language:"+$scope.formData.language);
    }
    qry = qry.join('+');
    CodeSearch.get({
      q: qry,
      page: $scope.formData.page
    }, function(response) {
      $scope.data = response.data;
      $scope.headers = response.headers;
      var maxResults = Math.min($scope.data.total_count, 1000);
      $scope.numOfPages = Math.ceil(maxResults/$scope.data.items.length);
    });
  };
  refresh();
});

app.controller('SearchUsersCtrl', function($scope, $state, $stateParams, PopularLanguages, UserSearch, range) {
  $scope.languages = PopularLanguages;
  $scope.formData = {
    language: $stateParams.language,
    query: $stateParams.query,
    page: parseInt($stateParams.page)
  };
  $scope.range = range;
  $scope.refreshSearch = function() {
    $scope.formData.page = 1;
    $state.go("search.users", $scope.formData);
  };

  function refresh() {
    var qry = [];
    if ($scope.formData.query) {
      qry.push($scope.formData.query);
    }
    if ($scope.formData.language) {
      qry.push("language:"+$scope.formData.language);
    }
    qry = qry.join('+');
    UserSearch.get({
      q: qry,
      page: $scope.formData.page
    }, function(response) {
      $scope.data = response;
      //$scope.headers = response.headers;
      var maxResults = Math.min($scope.data.total_count, 1000);
      $scope.numOfPages = Math.ceil(maxResults/$scope.data.items.length);
    });
  };
  refresh();
});

app.controller('BookmarksCtrl', function($scope, $stateParams, Bookmark) {
  $scope.getArray = function() {
    var log = [];
    angular.forEach(Bookmark.getBookmarks(), function(value, key) {
      this.push(value);
    }, log);
    return log;
  };
  $scope.bookmarks = Bookmark.getBookmarks();
});

app.run(function() {
  FastClick.attach(document.body);
});
