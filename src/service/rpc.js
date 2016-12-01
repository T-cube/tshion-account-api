import RPC from '@ym/rpc';

import rpcRoutes from '../rpc';

export function initRPC(rpcConfig) {
  return RPC
  .register(rpcConfig)
  .then(clientRpc => {
    rpcRoutes(clientRpc);
    return rpcConfig;
  });
}
