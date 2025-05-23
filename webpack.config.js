const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'development',
  entry: {
    popup: './src/JS/popup.js', // popup.ts に変更予定
    options: './src/JS/options.js', // options.ts に変更予定
    recorder: './src/JS/recorder.js', // recorder.ts に変更予定
    background: './src/JS/background.js', // background.ts に変更予定
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].js',
    clean: true, // ビルド前にdistフォルダをクリーンアップ
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
        ],
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: '' },
        { from: 'public/images', to: 'images' }, // アイコン画像をコピー
        // 必要に応じてスタティックCSSをコピー
        { from: 'public/output.css', to: '' },
        // カスタムスタイルファイルをdist/cssにコピー
        { from: 'src/styles/recorder.css', to: 'css/recorder.css' },
        { from: 'src/styles/options.css', to: 'css/options.css' },
        { from: 'src/styles/modal-styles.css', to: 'css/modal-styles.css' },
      ],
    }),
    new HtmlWebpackPlugin({
      template: './src/popup.html',
      filename: 'popup.html',
      chunks: ['popup'],
      inject: 'body',
    }),
    new HtmlWebpackPlugin({
      template: './src/options.html',
      filename: 'options.html',
      chunks: ['options'],
      inject: 'body',
    }),
    new HtmlWebpackPlugin({
      template: './src/recorder.html',
      filename: 'recorder.html',
      chunks: ['recorder'],
      inject: 'body',
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].css',
    }),
  ],
  resolve: {
    extensions: ['.ts', '.js'], // .ts ファイルを解決できるようにする
  },
  devtool: 'cheap-module-source-map',
};
