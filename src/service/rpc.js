import RPC from '@ym/rpc';

import rpcRoutes from '../rpc';

export function initRPC(rpcConfig, _loader) {
  return RPC
  .register(rpcConfig)
  .then(clientRpc => {
    _loader.bindLoader(clientRpc);
    rpcRoutes(clientRpc);
    return rpcConfig;
  });
}
