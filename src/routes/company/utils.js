import _ from 'underscore';

import { ApiError } from 'lib/error';
import C from 'lib/constants';

export function checkUserType(type) {
  return (req, res, next) => {
    if (!checkUserTypeFunc(req, type)) {
      throw new ApiError(403, null, 'member not authorised');
    }
    next();
  };
}

export function checkUserTypeFunc(req, type) {
  if (!req.company || _.isEmpty(req.company.members)) {
    throw new Error('company data not OK!');
  }
  const members = req.company.members;
  const member = _.find(members, m => m._id.equals(req.user._id));
  req.member = member;
  if (member.status != C.COMPANY_MEMBER_STATUS.NORMAL) {
    return false;
  }
  const TYPES = C.COMPANY_MEMBER_TYPE;
  let authorised = false;
  switch(member.type) {
  case TYPES.NORMAL:
    authorised = type == TYPES.NORMAL;
    break;
  case TYPES.ADMIN:
    authorised = type == TYPES.NORMAL || type == TYPES.ADMIN;
    break;
  case TYPES.OWNER:
    authorised = true;
  }
  return authorised;
}
