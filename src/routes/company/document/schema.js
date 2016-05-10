import { ENUMS } from 'lib/constants';

export let dirSanitization = {
	name: { type: 'string' },
	parent_dir: { $objectId: 1 },
};

export let dirValidation = {
	name: { type: 'string', minLength: 1 },
	parent_dir: { $objectId: 1 },
};

export let fileSanitization = {
	title: {  type: 'string' },
	description: {  type: 'string', optional: true },
	content: {  type: 'string', optional: true },
};

export let fileValidation = {
	title: {  type: 'string', minLength: 1 },
	description: {  type: 'string', optional: true },
	content: {  type: 'string', optional: true },
};
