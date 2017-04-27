import oauthModel from 'lib/oauth-model';

export default class account {
  static login(token) {
    return new Promise((resolve, reject) => {
      oauthModel.getAccessToken(token, (err, token) => {
        if (err) return reject(err);

        if (!token) return reject(new Error('token no exists'));

        resolve(token);
      });
    });
  }
}
