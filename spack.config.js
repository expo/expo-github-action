const { config } = require('@swc/core/spack');
const { readdirSync } = require('fs');
const { resolve, basename, extname } = require('path');

module.exports = config({
  target: 'node',
  entry: actions(resolve(__dirname, 'src/actions')),
  output: {
    path: resolve(__dirname, 'build'),
  },
  externalModules: externals(),
});

/**
 * Get all action entry points, in src/actions.
 * This returns them as `{ [name]: absolutePath }`.
 */
function actions(dir) {
  return Object.fromEntries(
    readdirSync(dir, { withFileTypes: true })
      .filter(entity => entity.isFile())
      .map(entity => {
        const actionName = basename(entity.name, extname(entity.name));
        const actionFile = resolve(dir, entity.name);
        return [actionName, actionFile];
      })
  );
}

/**
 * Get all external modules that should not be bundled.
 * Ignoring the packages in the `dependencies` list should keep them up to date.
 *
 * Note, currently `@actions/cache` can't be bundled by SWC due to modules issues in `@azure/core-http`:
 *   > internal error: entered unreachable code: module item found but is_es6 is false
 *
 * @see https://github.com/expo/expo-github-action/pull/62
 */
function externals() {
  return Object.keys(require('./package.json').dependencies);
}
