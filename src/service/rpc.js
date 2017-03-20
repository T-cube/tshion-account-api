import RPC from '@ym/rpc';

import initRoutes from '../rpc';

export function initRPC(rpcConfig, _loader) {
  return RPC
  .register(rpcConfig)
  .then(clientRpc => {
    initRoutes(clientRpc, _loader);
    return {rpcConfig, clientRpc};
  });
}
