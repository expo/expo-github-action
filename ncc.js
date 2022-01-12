const ncc = require('@vercel/ncc');
const fs = require('fs');
const path = require('path');

build();

async function build() {
  const actionsDir = path.resolve(__dirname, 'src/actions');
  const buildDir = path.resolve(__dirname, 'build');

  const actions = fs
    .readdirSync(actionsDir, { withFileTypes: true })
    .filter(entity => entity.isFile())
    .map(entity => ({
      name: path.basename(entity.name, path.extname(entity.name)),
      file: path.resolve(actionsDir, entity.name),
    }));

  for (const action of actions) {
    const files = await compile(action.file);
    write(files, path.resolve(buildDir, action.name));

    console.log(`✓ ${path.relative(__dirname, action.file)}`);
  }
}

async function compile(entry) {
  const { code, map, assets } = await ncc(entry, {
    cache: false,
    license: 'license.txt',
    quiet: true,
  });

  return {
    ...assets,
    'index.js': { source: code },
    'index.js.map': { source: map },
  };
}

function write(files, dir) {
  for (const fileName in files) {
    if (!files[fileName].source) {
      continue;
    }

    const filePath = path.resolve(dir, fileName);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, files[fileName].source, { encoding: 'utf-8' });
  }
}
