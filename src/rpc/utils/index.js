import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';

export function getObjectId(query = {}, key, fireErr = true) {
  let v = query[key];
  if (fireErr && !ObjectId.isValid(v)) {
    throw new ApiError(400, `invalid ${key} ${key}`);
  }
  return ObjectId(v);
}
