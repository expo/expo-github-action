import { getExecOutput } from '@actions/exec';
import * as toolCache from '@actions/tool-cache';
import {
  BunPackageManager,
  NpmPackageManager,
  PackageManagerOptions,
  PnpmPackageManager,
  YarnPackageManager,
} from '@expo/package-manager';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createToolPath } from './actions';
import { downloadCache, uploadCache } from './caches';

/**
 * Create a new package manager instance by name.
 * This supports `bun`, `npm`, `pnpm`, and `yarn`.
 * It also expects the package manager binary to be globally available.
 */
export function createPackageManager(name: string, options?: PackageManagerOptions) {
  switch (name.toLowerCase().trim()) {
    case 'bun':
      return new BunPackageManager(options);
    case 'npm':
      return new NpmPackageManager(options);
    case 'pnpm':
      return new PnpmPackageManager(options);
    case 'yarn':
      return new YarnPackageManager(options);
    default:
      throw new Error(
        `Unknown package manager provided '${name}', expected 'bun', 'npm', 'pnpm', or 'yarn'.`
      );
  }
}

/**
 * Resolve the exact version from a package using any range, dist-tag, or exact version.
 * This assumes that the package manager has the following signature:
 * - `bun info <name>@<specifier> version --json`
 * - `npm info <name>@<specifier> version --json`
 * - `pnpm info <name>@<specifier> version --json`
 *
 * Note, Yarn (v1) does not support this function signature and will use npm instead.
 */
export async function resolvePackageVersion(
  name: string,
  specifier: string,
  manager = 'npm'
): Promise<string> {
  // Yarn does not support `yarn info <name>@<specifier> version --json`
  if (manager === 'yarn') {
    manager = 'npm';
  }

  let stdout = '';
  try {
    ({ stdout } = await getExecOutput(manager, [
      'info',
      `${name}@${specifier}`,
      'version',
      '--json',
    ]));
  } catch (error: unknown) {
    throw new Error(`Could not resolve '${name}@${specifier}'.`, { cause: error });
  }

  // Thanks npm, for returning a "" json string value for invalid versions
  if (!stdout) {
    throw new Error(`Could not resolve '${name}@${specifier}', invalid version provided.`);
  }

  let output: string | string[] = '';
  try {
    output = JSON.parse(stdout);
  } catch (error: unknown) {
    throw new Error(`Failed parsing '${name}@${specifier}' JSON formatted package information.`, {
      cause: error,
    });
  }

  if (typeof output === 'string' && output) return output;
  if (Array.isArray(output) && output.length) return output.pop()!;

  throw new Error(`Could not resolve '${name}@${specifier}', no versions found.`);
}

/**
 * Install a package from either of these sources:
 *   - Local GitHub Actions tool cache
 *   - Remote persistent GitHub Actions cache
 *   - From provided package manager
 */
export async function installPackage({
  name,
  version,
  packageManager,
  packageCache,
}: {
  name: string;
  version: string;
  packageManager: string;
  packageCache: boolean;
}): Promise<string> {
  // Look up previous installations in the tool cache
  let toolPath = toolCache.find(name, version) || null;
  // Create the persistent cache key for this package
  const cacheKey = `${name}-${version}-${packageManager}-${process.platform}-${os.arch()}`;

  // Look up previous installations from the persisted cache
  if (!toolPath && packageCache) {
    toolPath = await downloadCache(createToolPath(name, version), cacheKey);
  }

  // Install the tool from package manager
  if (!toolPath) {
    toolPath = createToolPath(name, version);
    await fs.promises.mkdir(toolPath, { recursive: true });
    const manager = createPackageManager(packageManager, { cwd: toolPath });

    // npm requires an existing `package.json`
    await fs.promises.writeFile(path.join(toolPath, 'package.json'), JSON.stringify({}));
    await manager.addAsync([`${name}@${version}`]);

    // Add to the tool cache for future use
    if (packageCache) {
      await uploadCache(toolPath, cacheKey);
    }
  }

  return toolPath;
}
