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
  to: { $objectId: 1 },
  content: { type: 'string' },
}

export let commentValidation = {
  to: { $objectId: 1 },
  content: { type: 'string' },
}
