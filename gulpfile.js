const uglify = require('gulp-uglify')
const gulpClean = require('gulp-clean');


const { src, dest, series } = require('gulp');


function clean(cb) {
  return src('dist', { read: false, allowEmpty: true })
    .pipe(gulpClean())
}

function bundle() {
  return src('src/index.js')
    .pipe(src('src/util.js'))
    .pipe(uglify())
    .pipe(dest('dist/'))
}

exports.default = series(clean, bundle);
exports.clean = clean;
