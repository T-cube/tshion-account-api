import { buildValidator } from 'lib/inspector';
import C, { ENUMS } from 'lib/constants';

const schema = {
  create_order: {
    sanitization: {
      plan: { type: 'string', optional: true },
      order_type: { type: 'string' },
      member_count: { type: 'integer', optional: true },
      times: { type: 'integer', optional: true },
      coupon: { $objectId: 1, optional: true },
    },
    validation: {
      plan: { $enum: [C.TEAMPLAN.PRO, C.TEAMPLAN.ENT], optional: true },
      order_type: { $enum: ENUMS.ORDER_TYPE },
      member_count: { type: 'integer', optional: true },
      times: { type: 'integer', optional: true },
      coupon: { $objectId: 1, optional: true },
    },
  },
  create_order_newly: {
    sanitization: {
      plan: { type: 'string' },
      order_type: { type: 'string' },
      member_count: { type: 'integer' },
      times: { type: 'integer' },
      coupon: { $objectId: 1, optional: true },
    },
    validation: {
      plan: { $enum: [C.TEAMPLAN.PRO, C.TEAMPLAN.ENT] },
      order_type: { $enum: ENUMS.ORDER_TYPE },
      member_count: { type: 'integer' },
      times: { type: 'integer' },
      coupon: { $objectId: 1, optional: true },
    },
  },
  create_order_patch: {
    sanitization: {
      order_type: { type: 'string' },
      coupon: { $objectId: 1, optional: true },
    },
    validation: {
      order_type: { $enum: ENUMS.ORDER_TYPE },
      coupon: { $objectId: 1, optional: true },
    },
  },
  create_order_degrade: {
    sanitization: {
      plan: { type: 'string' },
      order_type: { type: 'string' },
      member_count: { type: 'integer' },
    },
    validation: {
      plan: { $enum: [C.TEAMPLAN.PRO, C.TEAMPLAN.ENT, C.TEAMPLAN.FREE] },
      order_type: { $enum: ENUMS.ORDER_TYPE },
      member_count: { type: 'integer' },
    },
  },
  create_order_upgrade: {
    sanitization: {
      plan: { type: 'string' },
      order_type: { type: 'string' },
      member_count: { type: 'integer' },
      coupon: { $objectId: 1, optional: true },
    },
    validation: {
      plan: { $enum: [C.TEAMPLAN.PRO, C.TEAMPLAN.ENT] },
      order_type: { $enum: ENUMS.ORDER_TYPE },
      member_count: { type: 'integer' },
      coupon: { $objectId: 1, optional: true },
    },
  },
  create_order_renewal: {
    sanitization: {
      order_type: { type: 'string' },
      times: { type: 'integer' },
      coupon: { $objectId: 1, optional: true },
    },
    validation: {
      order_type: { $enum: ENUMS.ORDER_TYPE },
      times: { type: 'integer' },
      coupon: { $objectId: 1, optional: true },
    },
  },
  pay: {
    sanitization: {
      payment_method: { type: 'string' },
    },
    validation: {
      payment_method: { $enum: ENUMS.PAYMENT_METHOD },
    },
  },
  recharge: {
    sanitization: {
      amount: { type: 'integer' },
      payment_method: { type: 'string' },
    },
    validation: {},
  },
  trial: {
    sanitization: {
      plan: { type: 'string' },
    },
    validation: {
      plan: { $enum: [C.TEAMPLAN.PRO, C.TEAMPLAN.ENT] },
    },
  },
};

export const validate = buildValidator(schema);
