const path = require("path");
const webpack = require("webpack");
const buildPath = "public/dist";
const Dotenv = require("dotenv-webpack");

module.exports = {
    entry: "./src/index.js",
    output: {
        path: path.join(__dirname, buildPath),
        filename: "bundle.js",
    },
    mode: "development",
    plugins: [
        new webpack.ProvidePlugin({
            process: "process/browser.js",
            Buffer: ["buffer", "Buffer"],
        }),
        new Dotenv(),
    ],
    resolve: {
        fallback: {
            crypto: require.resolve("crypto-browserify"),
            stream: require.resolve("stream-browserify"),
            buffer: require.resolve("buffer/"),
            path: require.resolve("path-browserify"),
            os: require.resolve("os-browserify/browser"),
            constants: require.resolve("constants-browserify"),
            assert: require.resolve("assert/"),
            fs: false,
        },
        extensions: [".js", ".ts"],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                include: path.resolve(__dirname, "src"),
            },
        ],
    },
    experiments: {
        topLevelAwait: true,
    },
};
