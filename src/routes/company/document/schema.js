// import { ENUMS } from 'lib/constants';

export let dirSanitization = {
	name: { type: 'string' },
	parent_dir: { $objectId: 1 },
};

export let dirValidation = {
	name: { type: 'string', minLength: 1 },
	parent_dir: { $objectId: 1 },
};

export let fileSanitization = {
	name: { type: 'string' },
	description: { type: 'string', optional: true },
	content: { type: 'string', optional: true },
};

export let fileValidation = {
	name: { type: 'string', minLength: 1 },
	description: { type: 'string', optional: true },
	content: { type: 'string', optional: true },
};

export let delSanitization = {
	files: {
		type: 'array',
		optional: true,
		items: {
			$objectId: 1
		}
	},
	dirs: {
		type: 'array',
		optional: true,
		items: {
			$objectId: 1
		}
	},
};

export let delValidation = {
	files: {
		type: 'array',
		optional: true,
		items: {
			$objectId: 1
		}
	},
	dirs: {
		type: 'array',
		optional: true,
		items: {
			$objectId: 1
		}
	},
};

export let moveSanitization = {
	files: {
		type: 'array',
		optional: true,
		items: {
			$objectId: 1
		}
	},
	dirs: {
		type: 'array',
		optional: true,
		items: {
			$objectId: 1
		}
	},
	origin_dir: { $objectId: 1 },
	target_dir: { $objectId: 1 },
};

export let moveValidation = {
	files: {
		type: 'array',
		optional: true,
		items: {
			$objectId: 1
		}
	},
	dirs: {
		type: 'array',
		optional: true,
		items: {
			$objectId: 1
		}
	},
	origin_dir: { $objectId: 1 },
	target_dir: { $objectId: 1 },
};
