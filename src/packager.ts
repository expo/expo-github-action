import { exec, getExecOutput } from '@actions/exec';
import { mkdirP } from '@actions/io';

import { cacheTool, tempPath } from './worker';

/**
 * Resolve a package with version range to an exact version.
 * This is useful to invalidate the cache _and_ using dist-tags or version ranges.
 * It executes `npm info` and parses the latest manifest.
 */
export async function resolvePackage(name: string, range: string): Promise<string> {
  let stdout = '';

  try {
    ({ stdout } = await getExecOutput('npm', ['info', `${name}@${range}`, 'version', '--json'], { silent: true }));
  } catch (error) {
    throw new Error(`Could not resolve ${name}@${range}, reason:\n${error.message || error}`);
  }

  // thanks npm, for returning a "" json string value for invalid versions
  if (!stdout) {
    throw new Error(`Could not resolve ${name}@${range}, reason:\nInvalid version`);
  }

  // thanks npm, for returning a "x.x.x" json value...
  if (stdout.startsWith('"')) {
    stdout = `[${stdout}]`;
  }

  return JSON.parse(stdout).at(-1);
}

/**
 * Install a module using a node package manager, inside a temporary directory.
 * If that's successful, move the module into the worker's tool cache.
 *
 * Note, we do assume that the packager is globally available AND has the `add <pkgspec>` command.
 */
export async function installPackage(name: string, version: string, manager: string) {
  const temp = tempPath(name, version);

  await mkdirP(temp);
  await exec(manager, ['add', `${name}@${version}`], { cwd: temp });

  return cacheTool(temp, name, version);
}
