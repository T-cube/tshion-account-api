import C, { ENUMS } from 'lib/constants';

export let validation = {
	from: { $objectId: 1 },
	to: { $objectId: 1 },
  action: { $enum: ENUMS.ACTIVITY_ACTION },
  target_type: { $enum: ENUMS.OBJECT_TYPE },
  company: { $objectId: 1, optional: true },
  project: { $objectId: 1, optional: true },
  task: { $objectId: 1, optional: true },
  reminding: { $objectId: 1, optional: true },
  user: { $objectId: 1, optional: true },
  request: { $objectId: 1, optional: true },
  field: { type: 'object', optional: true },
	is_read: { type: 'boolean' },
	date_create: { type: 'date' },
};
