import db from 'lib/database';
import C from 'lib/constants';

export default class ChargeOrder {

  constructor() {}

  static create(charge_type, order, payment_data) {
    let {company_id, paid_sum, order_no} = order;
    let {payment_type, payment_method} = payment_data;

    let data = {
      company_id,
      amount: paid_sum,
      charge_type,
      // payment_type,
      payment_method,
      order_id: order._id,
      order_no,
      date_create: new Date(),
      status: '',
      payment_data,
    };
    return db.payment.charge.order.insert(data);
  }

  static savePaymentNotifyAndGetData(payment_notify) {
    let {out_trade_no} = payment_notify;
    return db.payment.charge.order.findAndModify({
      query: {
        'payment_data.out_trade_no': out_trade_no,
      },
      update: {
        $set: {payment_notify}
      }
    })
    .then(doc => doc.value);
  }

  static savePaymentQueryAndGetData(payment_query) {
    let {out_trade_no} = payment_query;
    return db.payment.charge.order.findAndModify({
      query: {
        'payment_data.out_trade_no': out_trade_no,
      },
      update: {
        $set: {
          status: C.ORDER_STATUS.SUCCEED,
          payment_query
        }
      }
    })
    .then(doc => doc.value);
  }

    // _id: ObjectId,
    // charge_no: String,                        // 帐户收入流水号
    // company_id: ObjectId,             // 关联公司
    // amount: Currency,                 // 充值金额
    // invoice_issued: Boolean           // 发票是否已开具
    // payment_type: PaymentType         // 支付类型
    // payment_method: PaymentMethod,    // 支付方式
    // order_no: String,                 // 关联订单
    // date_create: Date,
    // // 支付接口信息（可选），参考 @ym-modules/payment
    // payment_data: {
    //   title: String,                  // 标题
    //   out_trade_no: String,           // 订单号
    //   total_fee: Currency,            // 总金额
    //   notify_url: String,             // 通知回调地址
    //   redirect_url: String,           // 重定向地址
    //   detail: String,                 // 商品详细描述
    //   product_id: String,             // 商品号
    //   method: String,                 // 支付方式
    //   service: String,                // 请求网关
    //   out_user: String,               // 支付者
    //   merchant_url: String,           // 支付中断回调地址
    //   agent_id: String,               // 代理人
    //   show_url: String,               // 商品展示地址
    //   spbill_create_ip: String,       // 用户实际ip地址
    //   time_start: Date,               // 支付发起时间
    //   time_expire: Date,              // 支付失效时间
    //   goods_tag: String,              // 商品标记
    //   limit_pay: String,              // 指定支付方式
    //   openid: String                  // 用户标识
    // },

}
