const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    game: './src/game.ts',
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    pathinfo: false,
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
      },
      {
        test: [/\.vert$/, /\.frag$/],
        use: 'raw-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [
    new webpack.DefinePlugin({
      'typeof SHADER_REQUIRE': JSON.stringify(false),
      'typeof CANVAS_RENDERER': JSON.stringify(true),
      'typeof WEBGL_RENDERER': JSON.stringify(true),
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './assets',
          to: './assets',
          force: true,
        },
        {
          from: './app.css',
          to: './app.css',
          force: true,
        },
      ],
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'index.html',
    }),
  ],
};
