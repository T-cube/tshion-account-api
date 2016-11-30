
import db from 'lib/database';

export default class ChargeOrder {

  list(options) {
    let { page, pagesize } = options;
    return db.charge.order.find();
  }

  get(_id) {
    return db.charge.order.findOne({_id});
  }

  create(data) {
    let { payment_type, payment_method } = data;
    let payment_data = this.generatePaymentData(data);

    return db.charge.order.insert({
      // charge_no: String,                        // 帐户收入流水号
      // company_id: ObjectId,             // 关联公司
      // amount: Currency,                 // 充值金额
      // invoice_issued: Boolean,           // 发票是否已开具
      // payment_type: PaymentType,         // 支付类型
      // payment_method: PaymentMethod,    // 支付方式
      // order_no: String,                 // 关联订单
      // date_create: Date,
      // payment_data,
    });
  }

  generatePaymentData() {
    // return {
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
    // };
  }

  pay(_id) {

  }

}
