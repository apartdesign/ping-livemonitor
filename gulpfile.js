var gulp = require('gulp');
var nodemon = require('gulp-nodemon');
var notify = require("gulp-notify");

gulp.task('server-dev', function () {
    nodemon({
        "execMap": {
            "js": "node"
        },
        script: './server/main.js',
        ext: 'js',
        ignore: ['./node_modules','./.idea','./build','./web','gulpfile.js']
    }).on('crash', function(){
        gulp.src("gulpfile.js").pipe(notify("App crashed"));
    })
});