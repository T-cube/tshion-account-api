import db from 'lib/database';

export default class Transaction {

  static init(type, info) {
    return db.transaction.insert(Object.assign({
      type,
      status: 'initial',
      date_create: new Date()
    }, info))
    .then(transaction => transaction._id);
  }

  static start(transactionId) {
    return Transaction._updateStatus(transactionId, 'pending');
  }

  static commit(transactionId) {
    return Transaction._updateStatus(transactionId, 'commited');
  }

  static done(transactionId) {
    return Transaction._updateStatus(transactionId, 'done');
  }

  static cancel(transactionId) {
    return Transaction._updateStatus(transactionId, 'canceled');
  }

  static _updateStatus(transactionId, status) {
    return db.transaction.update({
      _id: transactionId
    }, {
      $set: {status},
      $currentDate: {lastModified: true}
    });
  }

}
