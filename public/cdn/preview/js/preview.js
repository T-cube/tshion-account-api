(function(window) {
  
  let Doc = window.Doc || {};

  Doc.download = function(uri) {
    window.location.href = uri;
  };

  Doc.close = function() {
    console.log('hahah');
    window.close();
  };

  window.Doc = Doc;

})(window);
