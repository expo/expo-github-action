import { exec } from '@actions/exec';

/**
 * Resolve a package with version range to an exact version.
 * This is useful to invalidate the cache _and_ using dist-tags or version ranges.
 * It executes `npm info` and parses the latest manifest.
 */
export async function resolveVersion(name: string, range: string): Promise<string> {
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
    throw new Error(`Could not resolve version "${range}" of "${name}", reason:\n${error.message || error}`);
  }

  // thanks npm, for returning a "x.x.x" json value...
  if (stdout.startsWith('"')) {
    stdout = `[${stdout}]`;
  }

  return JSON.parse(stdout).at(-1);
}
