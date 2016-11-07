import { ValidationError } from 'lib/inspector';
import { ApiError } from 'lib/error';

export default class RpcRoute {

  constructor(socket, prefix) {
    this.socket = socket;
    this.prefix = prefix || '';
  }

  on(uri, callback) {
    this.socket.on(`${this.prefix}${uri}`, callback);
  }

  emit(uri, data) {
    this.socket.emit(`${this.prefix}${uri}`, data);
  }

  route(uri, callback) {
    this.socket.on(`${this.prefix}${uri}`, (query) => {
      let value;
      try {
        value = callback(query);
      } catch (e) {
        return this.emit(uri, this.errorHandler(value));
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
        console.error(e);
        this.emit(uri, this.errorHandler(e));
      });
    });
  }

  use(prefix, routes) {
    routes(this.socket, this.prefix + (prefix || ''));
    return this;
  }

  isPromise(value) {
    return value && typeof value.then === 'function';
  }

  errorHandler(err) {
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

}
