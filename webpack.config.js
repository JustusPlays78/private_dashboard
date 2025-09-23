const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const isDevelopment = process.env.NODE_ENV !== "production";

const commonConfig = {
  mode: isDevelopment ? "development" : "production",
  devtool: isDevelopment ? "source-map" : false,
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          isDevelopment ? "style-loader" : MiniCssExtractPlugin.loader,
          "css-loader",
          "postcss-loader",
        ],
      },
    ],
  },
};

const rendererConfig = {
  ...commonConfig,
  entry: "./src/renderer/index.tsx",
  target: "electron-renderer",
  output: {
    filename: "renderer.js",
    path: path.resolve(__dirname, "dist"),
    clean: false,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/renderer/index.html",
      filename: "index.html",
    }),
    ...(!isDevelopment
      ? [new MiniCssExtractPlugin({ filename: "styles.css" })]
      : []),
  ],
};

const mainConfig = {
  ...commonConfig,
  entry: "./src/main/main.ts",
  target: "electron-main",
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
    clean: false,
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  externals: {
    "better-sqlite3": "commonjs better-sqlite3",
  },
};

const preloadConfig = {
  ...commonConfig,
  entry: "./src/main/preload.ts",
  target: "electron-preload",
  output: {
    filename: "preload.js",
    path: path.resolve(__dirname, "dist"),
    clean: false,
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};

module.exports = [rendererConfig, mainConfig, preloadConfig];
