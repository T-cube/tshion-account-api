import accountRoutes from './account';

export default (socket) => {

  accountRoutes(socket.of('/account'));

};
