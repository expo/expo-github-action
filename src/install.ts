import * as core from '@actions/core';
import * as cli from '@actions/exec';
import * as io from '@actions/io';
import * as path from 'path';

import { fromLocalCache, fromRemoteCache, toLocalCache, toRemoteCache } from './cache';
import { PackageName } from './tools';

export type InstallConfig = {
  /** The exact version to install */
  version: string;
  /** The name of the package to install */
  package: PackageName;
  /** The packager to install with, likely to be `yarn` or `npm` */
  packager: string;
  /** If remote caching is enabled or not */
  cache?: boolean;
  /** The custom remote cache key */
  cacheKey?: string;
};

/**
 * Install `expo-cli`, by version, using the packager.
 * Here you can provide any semver range or dist tag used in the registry.
 * It returns the path where Expo is installed.
 */
export async function install(config: InstallConfig): Promise<string> {
  let root: string | undefined = await fromLocalCache(config);

  if (!root && config.cache) {
    root = await fromRemoteCache(config);
  } else {
    core.info('Skipping remote cache, not enabled...');
  }

  if (!root) {
    root = await fromPackager(config);
    root = await toLocalCache(root, config);

    if (config.cache) {
      await toRemoteCache(root, config);
    }
  }

  return path.join(root, 'node_modules', '.bin');
}

/**
 * Install `expo-cli`, by version, using npm or yarn.
 * It creates a temporary directory to store all required files.
 */
export async function fromPackager(config: InstallConfig): Promise<string> {
  const root = process.env['RUNNER_TEMP'] || '';
  const tool = await io.which(config.packager);

  await io.mkdirP(root);
  await cli.exec(tool, ['add', `${config.package}@${config.version}`], { cwd: root });

  return root;
}
