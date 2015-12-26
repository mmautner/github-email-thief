var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var mainBowerFiles = require('main-bower-files');
var history = require('connect-history-api-fallback');

gulp.task('clean', function() {
  return gulp.src('./dist/', {read: false})
    .pipe(plugins.clean());
});

gulp.task('copy', ['clean'], function() {
  return gulp.src([
      'app/img/**/*',
      'app/views/**/*',
      'app/js/**/*',
    ], {'base': 'app'})
    .pipe(gulp.dest('./dist/'));
});

gulp.task('copyFonts', ['clean'], function() {
  return gulp.src('app/bower/**/{,*/}*.{woff,woff2,eot,svg,ttf,otf}')
    .pipe(plugins.flatten())
    .pipe(gulp.dest('dist/fonts'));
});

gulp.task('inject_env', ['clean'], function() {
  return gulp.src('app/index.html')
    .pipe(plugins.replace(
      /\$GOOGLE_ANALYTICS_ID/, '"' + process.env.GOOGLE_ANALYTICS_ID + '"'
    ))
    .pipe(gulp.dest('dist/'));
});

gulp.task('main_css', ['clean'], function() {
  return gulp.src('app/css/*.css')
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.concat('main.css'))
    .pipe(plugins.sourcemaps.write())
    .pipe(gulp.dest('dist/css/'));
});

gulp.task('vendor_js', ['clean'], function() {
  return gulp.src(mainBowerFiles(['**/*.js']))
    .pipe(plugins.concat('vendor.js'))
    .pipe(gulp.dest('dist/js/'));
});

gulp.task('vendor_css', ['clean'], function() {
  return gulp.src(mainBowerFiles(['**/*.css']))
    .pipe(plugins.concat('vendor.css'))
    .pipe(gulp.dest('dist/css/'));
});

gulp.task('surge200', ['inject_env'], function() {
  return gulp.src(['dist/index.html' ], {'base': 'dist'})
    .pipe(plugins.rename('200.html'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('build', [
  'copyFonts',
  'copy',
  'inject_env',
  'vendor_js',
  'main_css',
  'vendor_css',
  'surge200'
]);

gulp.task('connect', ['build'], function() {
  plugins.connect.server({
    root: 'dist',
    port: 3474,
    livereload: true,
    middleware: function(connect, opt) {
      return [history()];
    }
  });
});

gulp.task('html', function() {
  gulp.src('./app/*.html')
    .pipe(plugins.connect.reload());
});

gulp.task('watch', function() {
  gulp.watch(['./app/*.html'], ['html']);
});

gulp.task('default', ['connect', 'watch']);

