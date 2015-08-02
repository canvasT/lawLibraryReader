/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Task configuration.
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      }
    },
    connect: {
      dev: { 
        port: 8080
      }
    },
    open : {
      dev : {
        path: 'http://127.0.0.1:8080/',
        app: 'Google Chrome',
        options:{
          delay : 2 
        }
      }
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-connect');
  grunt.loadNpmTasks('grunt-open');

  // Default task.
  grunt.registerTask('default', ['open','connect']);

  grunt.registerTask('deploy', 'concat and simply', function() {
    var source = grunt.file.read('index.html');
    // console.log(source.replace(/\\r\\n/gm,''))
    var mergeReg = new RegExp('<!--jsmerge:begin:(\\w+).js-->','gmi')
    var result ,
        spliceIndex = 0, 
        targetFile = '';
    while ((result = mergeReg.exec(source)) != null)  {
      var start = mergeReg.lastIndex,
        end = source.indexOf('<!--jsmerge:end:'+RegExp.$1+'.js-->');

        // 截取上一部分
        targetFile+= source.substring(spliceIndex, start);
        var jss = (source.substring(start,end));
        
        // 插入替换后的js文件
        targetFile += '\r\n<script src="'+parseAndConcat(jss, RegExp.$1)+'"></script>\r\n'
        //
        spliceIndex = end;
    }
    // 最后一部分
    targetFile += source.substring(spliceIndex);
    grunt.file.write('newIndex.html',targetFile);
    //
    grunt.log.write('Logging some stuff...').ok();

    function parseAndConcat(_input, _newname){
      var result ;
      var mergeReg = new RegExp('<script src="(.+)"></script>','gmi')

      var content = '';
      while ((result = mergeReg.exec(_input)) != null)  {
        // console.log(RegExp.$1)
        content += grunt.file.read(RegExp.$1);
      }
      var newfile = 'dist/'+_newname + '.js'
      grunt.file.write(newfile,content);
      return newfile;
    }
  });

};
