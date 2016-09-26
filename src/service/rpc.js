import RPC from '@ym/rpc';

RPC.register({
  protocol: 'http',
  hostname: '127.0.0.1',
  port: 2001,
  username: 'xuezi',
  password: 123456
})
.then(function(clientRpc){
  clientRpc.emit('pid', {pid: process.pid});
}).catch(e=>{
  throw e;
});
