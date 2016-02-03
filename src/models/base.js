import _ from 'underscore';

class BaseModel {

  constructor(data) {
    this._data = _.defaults(data, this.getDefault());
  }

  getDefault() {
    return {};
  }

  object() {
    return this._data;
  }
  
}

export default BaseModel;
