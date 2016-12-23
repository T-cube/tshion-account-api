import _ from 'underscore';
import { ValidationError } from 'lib/inspector';
import { ApiError } from 'lib/error';

export default class RpcRoute {

  constructor(socket, prefix, loader) {
    this.socket = socket;
    this.prefix = prefix || '';
    this.loader = loader;
  }

  on(uri, callback) {
    // this.socket.on(`${this.prefix}${uri}`, callback);
    this.route(uri, callback);
  }

  emit(uri, data) {
    this.socket.emit(`${this.prefix}${uri}`, data);
  }

  route(uri, callback) {
    this.socket.on(`${this.prefix}${uri}`, (query = {}) => {
      if (process.env.NODE_ENV != 'production') {
        console.log(`--- rpc call ${this.prefix}${uri}, query:`, query);
      }
      let value;
      try {
        value = callback(query, this.loader);
      } catch (e) {
        return this.emit(uri, this.errorHandler(e));
      }
      if (!this.isPromise(value)) {
        return this.emit(uri, {
          status: 200,
          data: value,
        });
      }
      value.then(data => this.emit(uri, {
        status: 200,
        data,
      }))
      .catch(e => {
        this.emit(uri, this.errorHandler(e));
      });
    });
  }

  // use(prefix, routes) {
  //   routes(this.socket, this.prefix + (prefix || ''));
  //   return this;
  // }

  isPromise(value) {
    return value && typeof value.then === 'function';
  }

  errorHandler(err) {
    console.error('rpc error', err);
    if (err instanceof ValidationError) {
      err = new ApiError(400, 'validation_error');
    }
    if (!(err instanceof ApiError)) {
      err = new ApiError(500, null);
    }
    return {
      status: err.code,
      error: err.name,
      error_description: err.message,
    };
  }

  use(prefix, routeBag) {
    let newInstance = new RpcRoute(this.socket, this.prefix + (prefix || ''), this.loader);
    _.each(routeBag.uses, (childRouteBag, sub_prefix) => {
      newInstance.use(sub_prefix, childRouteBag);
    });
    _.each(routeBag.routes, (callback, uri) => {
      newInstance.route(uri, callback);
    });
  }

  static router() {
    return new RouteBag();
  }

}

class RouteBag {

  constructor() {
    this.routes = {};
    this.uses = {};
  }

  on(uri, callback) {
    this.routes[uri] = callback;
  }

  use(prefix, childRouteBag) {
    this.uses[prefix] = childRouteBag;
  }

}
