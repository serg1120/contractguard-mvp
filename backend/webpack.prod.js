const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  target: 'node',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
    modules: ['node_modules'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
          mangle: {
            keep_classnames: true,
            keep_fnames: true,
          },
        },
        extractComments: false,
      }),
    ],
  },
  externals: {
    // Keep large dependencies external
    'puppeteer': 'commonjs puppeteer',
    'pg-native': 'commonjs pg-native',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  stats: {
    warnings: false,
  },
};