const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
module.exports = {
  entry: './dist/web.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist/web/')
  },
  module: {
    rules: [{
      test: /\.js$/,
      use: 'babel-loader'
    }]
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ]
  },
  node:{
      fs:'empty'
  },
  optimization: {
    minimize:true,
    minimizer: [new TerserPlugin()],
  },
};