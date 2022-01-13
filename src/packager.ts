import { exec } from '@actions/exec';
import { which, mkdirP } from '@actions/io';

import { cacheTool, tempPath } from './worker';

/**
 * Resolve a package with version range to an exact version.
 * This is useful to invalidate the cache _and_ using dist-tags or version ranges.
 * It executes `npm info` and parses the latest manifest.
 */
export async function resolvePackage(name: string, range: string): Promise<string> {
  let stdout = '';

  try {
    await exec('npm', ['info', `${name}@${range}`, 'version', '--json'], {
      silent: true,
      listeners: {
        stdout(data) {
          stdout += data.toString();
        },
      },
    });
  } catch (error) {
    throw new Error(`Could not resolve ${name}@${range}, reason:\n${error.message || error}`);
  }

  // thanks npm, for returning a "x.x.x" json value...
  if (stdout.startsWith('"')) {
    stdout = `[${stdout}]`;
  }

  return JSON.parse(stdout).at(-1);
}

/**
 * Install a module using a node package manager.
 * The installation is executed in a temporary folder.
 * After this is complete, it's "installed" into the worker's tool cache.
 */
export async function installPackage(name: string, version: string, manager: string) {
  const temp = tempPath(name, version);
  const tool = await which(manager);

  await mkdirP(temp);
  await exec(tool, ['add', `${name}@${version}`], { cwd: temp });

  return cacheTool(temp, name, version);
}
