const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    background: './background.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },  plugins: [    new CopyWebpackPlugin({
      patterns: [        { from: 'manifest.json', to: '' },
        { from: 'public', to: 'public' },
        { from: 'popup.html', to: '' },
        { from: 'recorder.html', to: '' },
        { from: 'options.html', to: '' },
        { from: 'popup.js', to: '' },
        { from: 'recorder.js', to: '' },
        { from: 'recorder.css', to: '' },
        { from: 'modal-styles.css', to: '' },
        { from: 'options.js', to: '' },
        { from: 'background.js', to: '' }
      ],
    }),
  ],
  devtool: 'cheap-module-source-map',
};
