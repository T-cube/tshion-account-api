import pmongo from 'pmongo';
import config from '../config';

export { ObjectId } from 'mongodb';

export function database() {
  return pmongo(config.db, [
   'user',
   'company',
 ]);
}
