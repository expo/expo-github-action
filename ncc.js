/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const fs = require('fs');
const ncc = require('@vercel/ncc');

const BUILD_DIR = path.resolve(__dirname, 'build');
const ACTION_DIR = path.resolve(__dirname, 'src/actions');

const options = {
	cache: false,
	minify: true,
	sourceMap: true,
	quiet: true,
};

async function write(file, content) {
	await fs.promises.writeFile(file, content, { encoding: 'utf-8' });
}

async function build(file) {
	const { code, map, assets } = await ncc(file, options);
	const name = path.basename(file, path.extname(file));
	const dir = path.resolve(BUILD_DIR, name);

	await fs.promises.mkdir(dir, { recursive: true })

	for (const asset in assets) {
		await fs.promises.mkdir(path.join(dir, path.dirname(asset)), { recursive: true })
		await write(path.join(dir, asset), assets[asset].source);
	}

	await write(path.join(dir, 'index.js'), code.replace(/\r\n/g, '\n'));
	await write(path.join(dir, 'index.map.js'), map.replace(/\r\n/g, '\n'));

	console.log(`✓ ${path.relative(__dirname, file)}`);
}

async function main() {
	const actionPath = path.resolve(__dirname, './src/actions')
	const actionFiles = (await fs.promises.readdir(actionPath, { withFileTypes: true }))
		.filter(entity => entity.isFile())
		.map(entity => path.join(ACTION_DIR, entity.name));

	return Promise.all(actionFiles.map(build))
}

main();
