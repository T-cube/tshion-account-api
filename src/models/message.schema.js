import C, { ENUMS } from 'lib/constants';

export let sanitization = {
	from: { $objectId: 1 },
	to: { $objectId: 1 },
  verb: { type: 'string' },
	object_type: { type: 'string' },
	object_id: { $objectId: 1 },
};

export let validation = {
  from: { $objectId: 1 },
	to: { $objectId: 1 },
  verb: { $enum: ENUMS.ACTIVITY_ACTION },
	object_type: { $enum: ENUMS.OBJECT_TYPE },
	object_id: { $objectId: 1 },
};
