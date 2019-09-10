import * as cli from '@actions/exec';
import * as io from '@actions/io';
import * as cache from '@actions/tool-cache';
import * as path from 'path';

const registry = require('libnpm');

/**
 * Resolve the provided semver to exact version of `expo-cli`.
 * This uses the npm registry and accepts latest, dist-tags or version ranges.
 * It's used to determine the cached version of `expo-cli`.
 */
export async function resolve(version: string) {
    return (await registry.manifest(`expo-cli@${version}`)).version;
}

/**
 * Install `expo-cli`, by version, using the packager.
 * Here you can provide any semver range or dist tag used in the registry.
 * It returns the path where Expo is installed.
 */
export async function install(version: string, packager: string) {
    const exact = await resolve(version);
    let root = await fromCache(exact);

    if (!root) {
        root = await fromPackager(exact, packager)
        await toCache(exact, root);
    }

    return path.join(root, 'node_modules', '.bin');
}

/**
 * Install `expo-cli`, by version, using npm or yarn.
 * It creates a temporary directory to store all required files.
 */
export async function fromPackager(version: string, packager: string) {
    const root = process.env['RUNNER_TEMP'] || '';
    const tool = await io.which(packager);

    await io.mkdirP(root);
    await cli.exec(tool, ['add', `expo-cli@${version}`], { cwd: root });

    return root;
}

/**
 * Get the path to the `expo-cli` from cache, if any.
 * Note, this cache is **NOT** shared between jobs.
 *
 * @see https://github.com/actions/toolkit/issues/47
 */
export async function fromCache(version: string) {
    return cache.find('expo-cli', version);
}

/**
 * Store the root of `expo-cli` in the cache, for future reuse.
 * Note, this cache is **NOT** shared between jobs.
 *
 * @see https://github.com/actions/toolkit/issues/47
 */
export async function toCache(version: string, root: string) {
    return cache.cacheDir(root, 'expo-cli', version);
}
