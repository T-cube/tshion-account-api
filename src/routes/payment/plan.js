import express from 'express';
import Promise from 'bluebird';
import config from 'config';
import bodyParser from 'body-parser';


let api = express.Router();
export default api;

// api.use(bodyParser.urlencoded({ extended: true }));
api.use(express.query());

api.post('/wechat', (req, res, next) => {
  let data = req.body;
  // checkSign(data).catch(next);
  let {return_code, result_code, out_trade_no, err_code} = data;
  // get order from out_trade_no
  // save notify data
  if (return_code == 'SUCCESS' && result_code == 'SUCCESS') {
    // BaseOrder.getPendingOrder(req.company._id)
    // .then(order => {
    //   db.payment.order.update({
    //     _id: order._id
    //   }, {
    //     $set: {
    //       status: 'successed'
    //     }
    //   });
    //   return new Plan(req.company._id).updatePaidFromOrder(order)
    //   .then(doc => {
    //     res.json(doc);
    //     console.log(doc);
    //   });
    // })
    // .catch(next);
  } else {
    if (err_code) {
      // 查询订单
    }
  }
});
