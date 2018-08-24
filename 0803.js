function aaa(name) {
  let path=name.split('').slice(0,3).join('/')+'/';
  return path;
}
let classPath=aaa('f3917fb9-9bde-4ec1-a7cf-966251b3d22a.jpg');
console.log(classPath);

const path=require('path');
function getUploadPath(dir) {
  let basePath='public/cdn/';
  if (!/^\//.test(basePath)) {
    basePath=path.normalize(__dirname+'/../../')+basePath;
  }
  if (!/\/$/.test(basePath)) {
    basePath+='/';
  }
  return path.normalize(basePath+dir);
}
let dir=getUploadPath('upload/avatar');
console.log(dir);

dir=dir+'/'+classPath;
console.log(dir);

function getUploadUrl(dir, filename) {
  return 'http://api.tlifang.com/cdn/'+dir+'/'+filename;
}
let url = getUploadUrl('upload/'+'avatar','f3917fb9-9bde-4ec1-a7cf-966251b3d22a.jpg');
console.log(url);

function getRelUploadPath(dir, name) {
  return dir+'/'+name;
}
let cdn_key=getRelUploadPath('upload/'+'avatar','f3917fb9-9bde-4ec1-a7cf-966251b3d22a.jpg');
console.log(cdn_key);

let relpath=getRelUploadPath('upload/'+'avatar',classPath+'f3917fb9-9bde-4ec1-a7cf-966251b3d22a.jpg');
console.log(relpath);