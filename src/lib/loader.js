/**
 * Model loader
 * @author alphakevin
 * @constructor
 * @param {type} object
 */
class Loader {

  constructor(object) {
    this._models = {};
    if (object) {
      this.bindLoader(object);
    }
  }

  model(name) {
    let self = this;
    if (!self._models[name]) {
      throw new Error('could not get model "' + name + '"!');
    }
    return self._models[name];
  }

  bindModel(name, object) {
    this.bindLoader(object);
    object._loader_inited = true;
    this._models[name] = object;
    return object;
  }

  loadModel(name, constructor) {
    let args = Array.prototype.slice.call(arguments, 2);
    function F() {
      return constructor.apply(this, args);
    }
    F.prototype = constructor.prototype;
    let object = new F();
    this.bindModel(name, object);
    if ('init' in object) {
      object.init();
    }
    return object;
  }

  bindLoader(object) {
    let self = this;
    object.model = self.model.bind(self);
    object.loadModel = self.loadModel.bind(self);
    object.bindModel = self.bindModel.bind(self);
    object.bindLoader = self.bindLoader.bind(self);
    return object;
  }
}

export default function(object) {
  return new Loader(object);
};
