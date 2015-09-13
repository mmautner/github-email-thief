var gulp = require('gulp');
var usemin = require('gulp-usemin');
var uglify = require('gulp-uglify');
var minifyHtml = require('gulp-minify-html');
var minifyCss = require('gulp-minify-css');
var rev = require('gulp-rev');
var clean = require('gulp-clean');
var flatten = require('gulp-flatten');


gulp.task('clean', function() {
  return gulp.src('./dist/', {read: false})
    .pipe(clean());
});

gulp.task('copyFonts', ['clean'], function() {
  return gulp.src('app/bower/**/{,*/}*.{woff,woff2,eot,svg,ttf,otf}')
    .pipe(flatten())
    .pipe(gulp.dest('./dist/fonts'));
});

gulp.task('copy', ['copyFonts'], function() {
  return gulp.src([
    './app/css/**/*',
    './app/img/**/*',
    './app/views/**/*',
    ], {'base': 'app'})
    .pipe(gulp.dest('./dist/'));
});

gulp.task('usemin', ['copy'], function() {
  return gulp.src('./app/index.html')
    .pipe(usemin({
      //css: [ minifyCss(), rev() ],
      //html: [ minifyHtml({ empty: true }) ],
      js: [ uglify(), rev() ],
      //appjs: [ uglify(), rev() ],
    }))
    .pipe(gulp.dest('dist/'));
});

gulp.task('default', ['usemin']);