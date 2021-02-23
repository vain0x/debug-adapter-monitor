// <https://webpack.js.org/configuration/>

const path = require("path")

const DIST_STATIC_DIR = path.resolve(__dirname, "dist/static")
const TSCONFIG_PATH = path.resolve(__dirname, "tsconfig-client.json")

module.exports = {
  context: __dirname,

  entry: "./src/client/index.tsx",

  output: {
    filename: "bundle.js",
    path: DIST_STATIC_DIR,
  },

  resolve: {
    extensions: [
      ".ts",
      ".tsx",
      ".js",
    ],
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: "ts-loader",
        options: {
          configFile: TSCONFIG_PATH,
        },
      },
      {
        enforce: "pre",
        test: /\.js$/,
        loader: "source-map-loader",
      },
    ],
  },

  externals: {
    "react": "React",
    "react-dom": "ReactDOM",
  },
}
