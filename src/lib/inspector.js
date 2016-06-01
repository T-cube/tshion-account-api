import _ from 'underscore';
import schemaInspector from 'schema-inspector';
import { ObjectId } from 'mongodb';
import { isEmail } from './utils';
import { ApiError } from './error';
import moment from 'moment-timezone';

let sanitizationCustom = {
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

let validationCustom = {
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
    if (-1 == schema.$enum.indexOf(candidate)) {
      this.report('invalid value: ' + candidate);
    }
  },
  timezone: function(schema, candidate) {
    if (!schema.$timezone) {
      return;
    }
    if (!moment.tz.zone(candidate)) {
      this.report('invalid timezone: ' + candidate);
    }
  },
  email: function(schema, candidate) {
    if (candidate && typeof candidate != 'string' || !isEmail(candidate)) {
      this.report('invalid email: ' + candidate);
    }
  },
  mobile: function(schema, candidate) {
    if (candidate && !/^1[3|4|5|7|8]\d{9}$/.test(candidate)) {
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

export default schemaInspector;
