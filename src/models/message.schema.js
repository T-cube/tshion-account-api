import C, { ENUMS } from 'lib/constants';

export let sanitization = {
	from: { $objectId: 1 },
	to: { $objectId: 1 },
  verb: { type: 'string', def: '' },
	target_type: { type: 'string' },
	target_id: { $objectId: 1 },
};

export let validation = {
  from: { $objectId: 1 },
	to: { $objectId: 1 },
  verb: { $enum: C.MESSAGE_VERB },
	target_type: { $enum: C.MESSAGE_TARGET_TYPE },
	target_id: { $objectId: 1 },
};
