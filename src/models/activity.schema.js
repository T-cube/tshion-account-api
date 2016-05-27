import C, { ENUMS } from 'lib/constants';

export let validation = {
	creator: { $objectId: 1 },
  action: { $enum: ENUMS.ACTIVITY_ACTION },
  target_type: { $enum: ENUMS.OBJECT_TYPE },
  company: { $objectId: 1, optional: true },
  project: { $objectId: 1, optional: true },
  task: { $objectId: 1, optional: true },
  user: { $objectId: 1, optional: true },
	field: { type: 'object', optional: true },
	approval_item: { type: 'object', optional: true },
	date_create: { type: 'date' },
};
