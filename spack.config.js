const { config } = require('@swc/core/spack');
const { readdirSync } = require('fs');
const { resolve, basename, extname } = require('path');

module.exports = config({
  target: 'node',
  entry: actions(resolve(__dirname, 'src/actions')),
  output: {
    path: resolve(__dirname, 'build'),
  },
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
