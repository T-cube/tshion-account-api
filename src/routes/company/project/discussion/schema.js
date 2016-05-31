import _ from 'underscore';
import { ENUMS } from 'lib/constants';

export let discussionSanitization = {
  title: { type: 'string' },
  content: { type: 'string' },
}

export let discussionValidation = {
  title: { type: 'string', minLength: 5 },
  content: { type: 'string' },
}

export let commentSanitization = {
  to: { $objectId: 1, optional: true },
  content: { type: 'string' },
}

export let commentValidation = {
  to: { $objectId: 1, optional: true },
  content: { type: 'string' },
}

export let followSanitization = {
  _id: { $objectId: 1 },
}

export let followValidation = {
  _id: { $objectId: 1 },
}
