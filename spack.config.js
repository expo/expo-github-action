const { config } = require('@swc/core/spack');
const { readdirSync } = require('fs');
const { resolve, basename, extname } = require('path');

const { dependencies } = require('./package.json');

module.exports = config({
  target: 'node',
  entry: actions(
    resolve(__dirname, './src/actions'),
  ),
  output: {
    path: resolve(__dirname, './build'),
  },
  externalModules: Object.keys(dependencies),
});

function actions(dir) {
  return Object.fromEntries(
    readdirSync(dir, { withFileTypes: true })
      .filter(entity => entity.isFile())
      .map(entity => [
        basename(entity.name, extname(entity.name)),
        resolve(dir, entity.name),
      ])
  );
}
