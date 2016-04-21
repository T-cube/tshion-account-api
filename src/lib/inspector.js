import schemaInspector from 'schema-inspector';
import { ObjectId } from 'mongodb';
import { isEmail, userId } from './utils';
import { ApiError } from './error';

let sanitizationCustom = {
  objectId: function (schema, post) {
    if (!post || ObjectId.isValid(post)) {
      this.report();
      return ObjectId(post);
    } else {
      return post;
    }
  },
  userId: function (schema, post) {
    this.report();
    return userId();
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
      if (!ObjectId.isValid(candidate)) {
          this.report('invalid ObjectId: ' + candidate);
      }
  },
  enum: function(schema, candidate) {
    if (_.isArray(schema.$enum) || schema.$enum.length) {
      return;
    }
    if (typeof candidate != 'string' || !schema.$enum.indexOf(candidate)) {
      this.report('invalid value: ' + candidate);
    }
  },
  email: function(schema, candidate) {
    if (typeof candidate != 'string' || !isEmail(candidate)) {
      this.report('invalid email: ' + candidate);
    }
  },
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
    result.customerError = new ApiError(400, null, result.error);
  }
  return result;
}

export default schemaInspector;
