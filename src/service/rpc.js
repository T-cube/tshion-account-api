import RPC from '@ym/rpc';
import config from 'config';

import rpcRoutes from '../rpc';

RPC
.register(config.get('rpc'))
.then((clientRpc) => rpcRoutes(clientRpc))
.catch(e => {
  console.error(e);
  // throw e;
});
