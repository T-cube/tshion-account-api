import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';

export function getObjectId(query, key) {
  let v = query[key];
  if (!v || !ObjectId.isValid(v)) {
    throw new ApiError(400, `invalid ${key}`);
  }
  return ObjectId(v);
}
