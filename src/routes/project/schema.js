import _ from 'underscore';
import memberType from './member-type';

export let projectSanitization = {
  name: { type: 'string' },
  description: { type: 'string' }
}

export let projectValidation = {
  name: {
		type: 'string',
		minLength: 1,
		maxLength: 100,
	},
  description: {
		type: 'string',
		maxLength: 1000
	}
}

export let memberSanitization = {
  _id: { $objectId: 1 },
  type: { type: 'int' },
	title: { type: 'string' }
}

export let memberValidation = {
	_id: { $objectId: 1 },
  type: { $enum: [0, 1, 2, 3, 4] },
	title: { type: 'string' }
}
