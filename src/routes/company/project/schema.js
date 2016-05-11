import _ from 'underscore';
import { ENUMS } from 'lib/constants';

export let projectSanitization = {
  name: { type: 'string' },
  description: { type: 'string', optional: true }
}

export let projectValidation = {
  name: {
		type: 'string',
		minLength: 1,
		maxLength: 100,
	},
  description: {
		type: 'string',
		maxLength: 1000,
    optional: true
	}
}

export let memberSanitization = {
  _id: { $objectId: 1 },
	title: { type: 'string', optional: true }
}

export let memberValidation = {
	_id: { $objectId: 1 },
	title: { type: 'string', optional: true }
}

export let tagSanitization = {
  name: { type: 'string' },             // 标签名称
  color: { type: 'string' },            // 标签颜色
}

export let tagValidation = {
  name: { type: 'string', minLength: 1 },
  color: { type: 'string' },
}

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
