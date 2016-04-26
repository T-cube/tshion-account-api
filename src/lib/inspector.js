import _ from 'underscore';
import schemaInspector from 'schema-inspector';
import { ObjectId } from 'mongodb';
import { isEmail, userId } from './utils';
import { ApiError } from './error';

let sanitizationCustom = {
  objectId: function (schema, post) {
    if (/^[A-Fa-f0-9]{24}$/.test(post)) {
      this.report();
      return ObjectId(post);
    } else {
      return post;
    }
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
    console.log(schema, candidate);
    if (_.isArray(schema.$enum) || schema.$enum.length) {
      return;
    }
    if (candidate && typeof candidate != 'string' || !schema.$enum.indexOf(candidate)) {
      this.report('invalid value: ' + candidate);
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

export function sanitizeValidateObject(sanitizationSchema, validationSchema, data) {
  sanitizeObject(sanitizationSchema, data);
  let result = validateObject(validationSchema, data);
  if (!result.valid) {
    throw new ApiError(400, null, result.error);
  }
  return result;
}

export default schemaInspector;
