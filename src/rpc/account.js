

export default (socket) => {

  socket.on('list', () => {
    socket.emit('list', {list: []});
  });

};
