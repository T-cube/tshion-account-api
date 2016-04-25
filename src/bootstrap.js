require('app-module-path').addPath(__dirname);
var config = require('config');
console.log('loaded config:\n\n', config, '\n');
global.BASE_PATH = __dirname + '/../';
