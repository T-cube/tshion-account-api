import db from 'lib/database';
import {findObjectIdIndex} from 'lib/utils';

export default class Banlance {

  static incBalance(company_id, amount, log, transactionId) {
    if (0 == amount) {
      return Promise.resolve();
    }
    return db.payment.balance.findOne({
      _id: company_id
    })
    .then(doc => {
      let transactionReach = doc && doc.transactions && (findObjectIdIndex(doc.transactions, transactionId) >= 0);
      if (transactionReach) {
        return;
      }
      if (!doc) {
        doc = {
          balance: 0
        };
      }
      if ((doc.balance + amount) < 0 && amount < 0) {
        throw new Error('balance_insufficient');
      }
      log.amount = amount;
      log.date_create = new Date();
      log.balance = doc.balance + amount;
      return db.payment.balance.update({
        _id: company_id
      }, {
        $inc: {
          balance: amount
        },
        $addToSet: {
          transactions: transactionId,
        },
        $push: {
          log
        }
      }, {
        upsert: true
      });
    });
  }

  static commitIncBalance(company_id, transactionId) {
    return db.payment.balance.update({
      _id: company_id
    }, {
      $pull: {
        transactions: transactionId
      }
    });
  }

}
