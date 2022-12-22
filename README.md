# ZK Ownership Web

> This is highly experimental contracts not recommended for production.

## Install dependencies

-   Run `yarn` at the top level to install npm dependencies (`snarkjs` and `circomlib`).
-   Run `yarn build` to get `bundle.js`.
  -  `yarn patch` fixes the import from `constants` due to the restriction of webpack 5 importing json as module. https://webpack.js.org/migrate/5/#using-named-exports-from-json-modules
-   Run `yarn start` to start http-server.
