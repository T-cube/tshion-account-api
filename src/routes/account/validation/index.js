import Joi from 'joi';
import _ from 'underscore';

let _valid = {
  type: Joi.string().valid('email', 'mobile').required(),
  email: Joi.alternatives().when('type', {is: 'email',
    then: Joi.string().email().required(),
    otherwise: Joi.any().strip(),
  }),
  mobile: Joi.alternatives().when('type', {is: 'mobile',
    then: Joi.string().regex(/^1[3|4|5|7|8]\d{9}$/),
    otherwise: Joi.any().strip(),
  }),
  password: Joi.string().min(6).max(20).required(),
  // code: Joi.string().regex(/^\d{6}$/).required(),
  code: Joi.alternatives().when('type', {is: 'mobile',
    then: Joi.string().regex(/^\d{6}$/).required(),
    otherwise: Joi.any().strip(),
  })
};

export default {
  check: {
    body: _.pick(_valid, 'type', 'email', 'mobile')
  },
  register: {
    body: _valid
  }
}
