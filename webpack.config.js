import { execSync } from "child_process";
import CopyPlugin from "copy-webpack-plugin";
import dotenv from "dotenv";
import ESLintPlugin from "eslint-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import path from "path";
import { fileURLToPath } from "url";
import webpack from "webpack";

dotenv.config();

function parseBoolean(value) {
  if (!value) return false;
  switch (value.toLowerCase()) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    default:
      return false;
  }
}

function buildOrigin(protocol, host, port) {
  if (!host) return undefined;
  const normalizedProtocol = (protocol ?? "http").replace(/:$/, "").toLowerCase();
  const defaultPort = normalizedProtocol === "https" ? "443" : "80";
  const trimmedPort = (port ?? "").trim();
  const portSegment =
    trimmedPort.length > 0 && trimmedPort !== defaultPort ? `:${trimmedPort}` : "";
  return `${normalizedProtocol}://${host}${portSegment}`;
}

function resolveRemoteOrigin() {
  if (process.env.DEV_REMOTE_ORIGIN && process.env.DEV_REMOTE_ORIGIN.length > 0) {
    return process.env.DEV_REMOTE_ORIGIN;
  }
  if (parseBoolean(process.env.USE_REMOTE_DEV ?? "")) {
    return buildOrigin(
      process.env.PUBLIC_PROTOCOL_DEV ?? "http",
      process.env.PUBLIC_HOST_DEV,
      process.env.PUBLIC_PORT_DEV,
    );
  }
  return undefined;
}

function createRemoteProxyConfig(remoteOrigin) {
  if (!remoteOrigin) return [];
  const normalizedOrigin = remoteOrigin.replace(/\/$/, "");
  const remoteUrl = new URL(normalizedOrigin);
  const secure = remoteUrl.protocol === "https:";
  const websocketOrigin = `${secure ? "wss" : "ws"}://${remoteUrl.host}`;

  const httpPrefixes = ["/api", "/matchmaking", "/login", "/cosmetics"];

  const isWorkerPath = (pathname = "") => /^\/w\d+(\/|$)/.test(pathname);

  const httpContext = (pathname = "", req) => {
    const upgradeHeader = req?.headers?.upgrade;
    if (upgradeHeader && upgradeHeader.toLowerCase() === "websocket") {
      return false;
    }
    if (pathname?.startsWith("/socket") || isWorkerPath(pathname)) {
      return true;
    }
    return httpPrefixes.some((prefix) => pathname?.startsWith(prefix));
  };

  const websocketContext = (pathname = "", req) => {
    const upgradeHeader = req?.headers?.upgrade;
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
      return false;
    }
    if (pathname?.startsWith("/socket")) {
      return true;
    }
    return isWorkerPath(pathname);
  };

  return [
    {
      context: websocketContext,
      target: websocketOrigin,
      ws: true,
      changeOrigin: true,
      secure,
      logLevel: "debug",
    },
    {
      context: httpContext,
      target: normalizedOrigin,
      changeOrigin: true,
      secure,
      logLevel: "debug",
    },
  ];
}

function createLocalProxyConfig() {
  const workerProxy = (index) => {
    const pathKey = `/w${index}`;
    const basePort = 3001 + index;
    return [
      {
        context: [pathKey],
        target: `ws://localhost:${basePort}`,
        ws: true,
        secure: false,
        changeOrigin: true,
        logLevel: "debug",
      },
      {
        context: [pathKey],
        target: `http://localhost:${basePort}`,
        pathRewrite: { [`^${pathKey}`]: "" },
        secure: false,
        changeOrigin: true,
        logLevel: "debug",
      },
    ];
  };

  const workerConfigs = [0, 1, 2].flatMap((index) => workerProxy(index));

  return [
    {
      context: ["/socket"],
      target: "ws://localhost:3000",
      ws: true,
      changeOrigin: true,
      logLevel: "debug",
    },
    ...workerConfigs,
    {
      context: [
        "/api/env",
        "/api/game",
        "/api/public_lobbies",
        "/api/join_game",
        "/api/start_game",
        "/api/create_game",
        "/api/archive_singleplayer_game",
        "/api/auth/callback",
        "/api/auth/discord",
        "/api/kick_player",
        "/api/feedback",
      ],
      target: "http://localhost:3000",
      secure: false,
      changeOrigin: true,
    },
  ];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const gitCommit =
  process.env.GIT_COMMIT ?? execSync("git rev-parse HEAD").toString().trim();

export default async (env, argv) => {
  const isProduction = argv.mode === "production";
  const remoteOrigin = resolveRemoteOrigin();
  const proxyConfig = remoteOrigin
    ? createRemoteProxyConfig(remoteOrigin)
    : createLocalProxyConfig();
  const resolvedApiDomain =
    process.env.API_DOMAIN ??
    (remoteOrigin
      ? process.env.API_BASE_URL_DEV ?? remoteOrigin
      : undefined);

  return {
    entry: "./src/client/Main.ts",
    output: {
      publicPath: "/",
      filename: "js/[name].[contenthash].js", // Added content hash
      path: path.resolve(__dirname, "static"),
      clean: isProduction,
    },
    module: {
      rules: [
        {
          test: /\.bin$/,
          type: "asset/resource", // Changed from raw-loader
          generator: {
            filename: "binary/[name].[contenthash][ext]", // Added content hash
          },
        },
        {
          test: /\.txt$/,
          type: "asset/source",
        },
        {
          test: /\.md$/,
          type: "asset/resource", // Changed from raw-loader
          generator: {
            filename: "text/[name].[contenthash][ext]", // Added content hash
          },
        },
        {
          test: /\.ts$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            "style-loader",
            {
              loader: "css-loader",
              options: {
                importLoaders: 1,
              },
            },
            {
              loader: "postcss-loader",
              options: {
                postcssOptions: {
                  plugins: ["tailwindcss", "autoprefixer"],
                },
              },
            },
          ],
        },
        {
          test: /\.(webp|png|jpe?g|gif)$/i,
          type: "asset/resource",
          generator: {
            filename: "images/[name].[contenthash][ext]", // Added content hash
          },
        },
        {
          test: /\.html$/,
          use: ["html-loader"],
        },
        {
          test: /\.svg$/,
          type: "asset/resource", // Changed from asset/inline for caching
          generator: {
            filename: "images/[name].[contenthash][ext]", // Added content hash
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf|xml)$/,
          type: "asset/resource", // Changed from file-loader
          generator: {
            filename: "fonts/[name].[contenthash][ext]", // Added content hash and fixed path
          },
        },
        {
          test: /\.(mp3|wav|ogg)$/i,
          type: "asset/resource",
          generator: {
            filename: "sounds/[name].[contenthash][ext]",
          },
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
      alias: {
        "protobufjs/minimal": path.resolve(
          __dirname,
          "node_modules/protobufjs/minimal.js",
        ),
      },
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./src/client/index.html",
        filename: "index.html",
        // Add optimization for HTML
        minify: isProduction
          ? {
            collapseWhitespace: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true,
          }
          : false,
      }),
      new HtmlWebpackPlugin({
        template: "./src/client/yandex-games_iframe.html",
        filename: "yandex-games_iframe.html",
        // Add optimization for HTML
        minify: isProduction
          ? {
            collapseWhitespace: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true,
          }
          : false,
      }),
      new HtmlWebpackPlugin({
        template: "./src/client/yandex-games_iframe-parent.html",
        filename: "yandex-games_iframe-parent.html",
        // Add optimization for HTML
        minify: isProduction
          ? {
            collapseWhitespace: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true,
          }
          : false,
      }),

      new webpack.DefinePlugin({
        "process.env.WEBSOCKET_URL": JSON.stringify(
          isProduction ? "" : "localhost:3000",
        ),
        "process.env.GAME_ENV": JSON.stringify(isProduction ? "prod" : "dev"),
        "process.env.GIT_COMMIT": JSON.stringify(gitCommit),
        "process.env.STRIPE_PUBLISHABLE_KEY": JSON.stringify(
          process.env.STRIPE_PUBLISHABLE_KEY,
        ),
        "process.env.API_DOMAIN": JSON.stringify(resolvedApiDomain),
      }),
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, "resources"),
            to: path.resolve(__dirname, "static"),
            noErrorOnMissing: true,
          },
          {
            from: path.resolve(__dirname, "proprietary"),
            to: path.resolve(__dirname, "static"),
            noErrorOnMissing: true,
          },
        ],
        options: { concurrency: 100 },
      }),
      new ESLintPlugin({
        context: __dirname,
      }),
    ],
    optimization: {
      // Add optimization configuration for better caching
      runtimeChunk: "single",
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
          },
        },
      },
    },
    devServer: isProduction
      ? {}
      : {
        devMiddleware: { writeToDisk: true },
        static: {
          directory: path.join(__dirname, "static"),
        },
        historyApiFallback: true,
        compress: true,
        port: 9000,
        proxy: proxyConfig,
      },
  };
};
