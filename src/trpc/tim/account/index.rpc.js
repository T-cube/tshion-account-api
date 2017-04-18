'use strict';
import account from 'models/tim/account';

module.exports = {
  'login': function(obj) {
    return account.login(obj.token);
  }
};
