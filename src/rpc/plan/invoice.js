import { ObjectId } from 'mongodb';
import { strToReg } from 'lib/utils';
import { ApiError } from 'lib/error';

import RpcRoute from 'models/rpc-route';
import {ENUMS} from 'lib/constants';
import { validate } from '../schema/plan';
import { getObjectId } from '../utils';
import InvoiceModel from '../models/invoice';

const route = RpcRoute.router();
export default route;
const invoiceModel = new InvoiceModel();

route.on('/list', (query) => {
  validate('invoice_list', query);
  let { page, pagesize, status, keyword, company_id, type } = query;
  let criteria = {};
  if (status) {
    criteria = {status};
  }
  if (ObjectId.isValid(company_id)) {
    criteria.company_id = ObjectId(company_id);
  }
  if (type == 'invoice_no') {
    criteria.invoice_no = {
      $regex: keyword
    };
  }
  if (type == 'company_name') {
    criteria.title = {
      $regex: strToReg(keyword)
    };
  }
  // if (InvoiceModel.isInvoiceNoLike(keyword)) {
  //   criteria.invoice_no = {
  //     $regex: keyword
  //   };
  // }
  return invoiceModel.page({
    page,
    pagesize,
    criteria,
  });
});

route.on('/detail', (query) => {
  let invoice_id = getObjectId(query, 'invoice_id');
  return invoiceModel.fetchDetail(invoice_id)
  .then(info => {
    if (!info) {
      throw new ApiError(404);
    }
    return info;
  });
});

route.on('/update', query => {
  validate('invoice_status', query);
  return invoiceModel.updateStatus(query);
});

route.on('/send', query => {
  validate('invoice_send', query);
  return invoiceModel.send(query);
});
