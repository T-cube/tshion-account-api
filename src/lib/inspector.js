import _ from 'underscore';
import Promise from 'bluebird';
import schemaInspector from 'schema-inspector';
import { ObjectId } from 'mongodb';
import { isEmail } from './utils';
import { ApiError } from './error';
import moment from 'moment-timezone';

const sanitizationCustom = {
  objectId: function (schema, post) {
    if (/^[A-Fa-f0-9]{24}$/.test(post)) {
      this.report();
      return ObjectId(post);
    }
    return post;
  },
  emptyArray: function (schema, post) {
    this.report();
    return [];
  },
};

const validationCustom = {
  objectId: function (schema, candidate) {
    if (!schema.$objectId) {
      return;
    }
    if (candidate && !ObjectId.isValid(candidate)) {
      this.report('invalid ObjectId: ' + candidate);
    }
  },
  enum: function(schema, candidate) {
    if (!_.isArray(schema.$enum) || !schema.$enum.length) {
      return;
    }
    if (-1 == schema.$enum.indexOf(candidate) && true !== schema.optional) {
      this.report('invalid value: ' + candidate);
    }
  },
  timezone: function(schema, candidate) {
    if (!schema.$timezone) {
      return;
    }
    if (candidate && !moment.tz.zone(candidate)) {
      this.report('invalid timezone: ' + candidate);
    }
  },
  email: function(schema, candidate) {
    if (!_.isString(candidate) ||
      !/^[a-z0-9\.]+@([a-z0-9\-]+\.)+[a-z]+$/.test(candidate)) {
      this.report('invalid email: ' + candidate);
    }
  },
  mobile: function(schema, candidate) {
    if (!_.isString(candidate) ||
      !/^1[3|4|5|7|8]\d{9}$/.test(candidate)) {
      this.report('invalid mobile: ' + candidate);
    }
  }
};
schemaInspector.Validation.extend(validationCustom);
schemaInspector.Sanitization.extend(sanitizationCustom);

export function sanitizeObject(schema, data) {
  schemaInspector.sanitize({
    type: 'object',
    strict: true,
    properties: schema
  }, data);
}

export function validateObject(schema, data) {
  return schemaInspector.validate({
    type: 'object',
    strict: true,
    properties: schema
  }, data);
}

export function validate(schema, data) {
  let result = validateObject(schema, data);
  if (!result.valid) {
    console.error(result.error);
    throw new Error(result.error);
  }
}

export function sanitizeValidateObject(sanitizationSchema, validationSchema, data) {
  sanitizeObject(sanitizationSchema, data);
  let result = validateObject(validationSchema, data);
  if (!result.valid) {
    console.error(result);
    throw new ApiError(400, null, result.error);
  }
  return result;
}

export function formatValidationError(error) {
  let errorObject = {};
  _.each(error, item => {
    let { code, message, property } = item;
    let key = property.replace('@.', '');
    errorObject[key] = {
      code,
      message,
    };
    return errorObject;
  });
  return errorObject;
}

export class ValidationError {
  constructor(error) {
    this.message = error;
  }
}

export function mapObjectAlias(object, aliases) {
  let newSchema = {};
  _.each(aliases, (key, alias) => {
    if (object[key]) {
      newSchema[alias] = object[key];
    }
  });
  return newSchema;
}

// options can be string, array, object:
//   string: 'key1,key2,alias3 as key3'
//   array: ['key1', 'key2', {alias3: key3}]
//   object: {alias1: key1, alias2: key2}
export function selectRules(schema, options) {
  if (options == null) {
    return schema;
  }
  if (_.isString(options)) {
    options = options.split(/,\s?/);
  }
  if (_.isObject(options) && !_.isArray(options)) {
    return mapObjectAlias(schema, options);
  }
  if (_.isArray(options)) {
    let newSchema = {};
    _.each(options, item => {
      if (_.isString(item)) {
        let [key, alias] = item.split(/ as /i);
        if (!alias) {
          alias = key;
        }
        if (schema[key]) {
          newSchema[alias] = schema[key];
        }
      } else if (_.isObject(item)) {
        _.extend(newSchema, mapObjectAlias(schema, item));
      }
    });
    return newSchema;
  }
  throw new Error('invalid rule options');
}

export function buildValidator(schema) {
  return function validate(type, data, options) {
    if (!_.has(schema, type)) {
      throw new Error(`cannot find schema "${type}"`);
    }
    let schemaData = schema[type];
    let { sanitization, validation } = schemaData;
    if (options) {
      sanitization = selectRules(sanitization, options);
      validation = selectRules(validation, options);
    }
    sanitizeObject(sanitization, data);
    let result = validateObject(validation, data);
    if (!result.valid) {
      const error = formatValidationError(result.error);
      throw new ValidationError(error);
    }
  };
}

export default schemaInspector;
