import appModulePath from 'app-module-path';
import path from 'path';

appModulePath.addPath(__dirname);
global.BASE_PATH = path.normalize(__dirname + '/../');
