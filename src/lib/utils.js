import _ from 'underscore';

export function getUniqName(list, name, index) {
  if (_.contains(list, name)) {
    let match = /^(.+)\((\d+)\)$/.exec(name);
    if (match) {
      let baseName = match[1];
      let index = parseInt(match[2]) + 1;
      let newName = `${baseName}(${index})`;
      console.log(newName);
      return getUniqName(list, newName);
    } else {
      return getUniqName(list, `${name}(2)`);
    }
  } else {
    return name;
  }
}
