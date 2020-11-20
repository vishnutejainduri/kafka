const { createProxyMiddleware } = require('http-proxy-middleware');
const morgan = require("morgan");

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': ''
      }
    })
  );

  app.use(morgan('combined'));
};
