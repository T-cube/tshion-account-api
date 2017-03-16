import _ from 'underscore';
import C, { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';

const schema = {
  broadcast: {
    sanitization: {
      title: { type: 'string' },
      content: { type: 'string' },
      link: { type: 'string', optional: true },
      creator: { type: 'string' },
    },
    validation: {
      title: { type: 'string' },
      content: { type: 'string' },
      link: { type: 'string', optional: true },
      creator: { type: 'string' },
    },
  },
  broadcast_status: {
    sanitization: {
      broadcast_id: { type: 'string'},
      status: { type: 'string' }
    },
    validation: {
      broadcast_id: { $objectId: 1 },
      status: {  $enum: ENUMS.BROADCAST_STATUS }
    },
  },
  broadcast_id: {
    sanitization: {
      broadcast_id: { type: 'string'},
    },
    validation: {
      broadcast_id: { $objectId: 1 },
    },
  }
};
