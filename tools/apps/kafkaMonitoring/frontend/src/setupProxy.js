const { createProxyMiddleware } = require('http-proxy-middleware');
const morgan = require("morgan");

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:4000',
      changeOrigin: true
    })
  );

  app.use(morgan('combined'));
};
