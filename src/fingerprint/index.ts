import { getBooleanInput, getInput, group, info } from '@actions/core';
import { context as githubContext } from '@actions/github';
import { mkdirP } from '@actions/io';
import type * as Fingerprint from '@expo/fingerprint';
import assert from 'assert';
import fs from 'fs';
import path from 'path';

import { FingerprintDbEntity, FingerprintDbManager } from './FingerprintDbManager';
import { restoreCacheAsync, restoreFromCache, saveCacheAsync, saveToCache } from '../cacher';
import { installPackage, resolvePackage } from '../packager';
import { installSQLiteAsync } from '../sqlite';
import { addGlobalNodeSearchPath, findTool, installToolFromPackage } from '../worker';

export * from './FingerprintDbManager';

export interface FingerprintOutput {
  currentFingerprint: Fingerprint.Fingerprint;
  previousFingerprint: Fingerprint.Fingerprint | null;
  diff: Fingerprint.FingerprintDiffItem[];
}

/**
 * Shared logic to create a fingerprint diff for fingerprint actions
 */
export async function createFingerprintOutputAsync(
  dbManager: FingerprintDbManager,
  input: ReturnType<typeof collectFingerprintActionInput>
): Promise<FingerprintOutput> {
  await installFingerprintAsync(
    input.fingerprintVersion,
    input.packager,
    input.fingerprintInstallationCache
  );
  const fingerprint = require('@expo/fingerprint') as typeof import('@expo/fingerprint');
  const currentFingerprint = await fingerprint.createFingerprintAsync(input.workingDirectory);

  let previousFingerprint: FingerprintDbEntity | null = null;
  if (input.previousGitCommitHash) {
    previousFingerprint = await dbManager.getEntityFromGitCommitHashAsync(
      input.previousGitCommitHash
    );
  }

  const diff =
    previousFingerprint != null
      ? await fingerprint.diffFingerprints(previousFingerprint.fingerprint, currentFingerprint)
      : await fingerprint.diffFingerprints({ sources: [], hash: '' }, currentFingerprint);
  return {
    currentFingerprint,
    previousFingerprint: previousFingerprint?.fingerprint ?? null,
    diff,
  };
}

/**
 * Create a FingerprintDbManager instance
 */
export async function createFingerprintDbManagerAsync(
  packager: string,
  cacheKey: string
): Promise<FingerprintDbManager> {
  await installSQLiteAsync(packager);

  const dbPath = await getDbPathAsync();
  const cacheHit = (await restoreDbFromCacheAsync(cacheKey)) != null;
  if (cacheHit) {
    info(`Restored fingerprint database from cache - cacheKey[${cacheKey}]`);
  } else {
    info(
      `Missing fingerprint database from cache - will create a new database - cacheKey[${cacheKey}]`
    );
  }
  const dbManager = new FingerprintDbManager(dbPath);
  await dbManager.initAsync();
  return dbManager;
}

/**
 * Common inputs for fingerprint actions
 */
export function collectFingerprintActionInput() {
  return {
    packager: getInput('packager') || 'yarn',
    githubToken: getInput('github-token'),
    workingDirectory: getInput('working-directory'),
    fingerprintVersion: getInput('fingerprint-version') || 'latest',
    fingerprintInstallationCache:
      !getInput('fingerprint-installation-cache') ||
      getBooleanInput('fingerprint-installation-cache'),
    fingerprintDbCacheKey: getInput('fingerprint-db-cache-key'),
    previousGitCommitHash:
      getInput('previous-git-commit') ||
      (githubContext.eventName === 'pull_request'
        ? githubContext.payload.pull_request?.base?.sha
        : githubContext.payload.before),
    currentGitCommitHash:
      getInput('current-git-commit') ||
      (githubContext.eventName === 'pull_request'
        ? githubContext.payload.pull_request?.head?.sha
        : githubContext.sha),
    savingDbBranch: getInput('saving-db-branch') || undefined,
  };
}

/**
 * Install @expo/fingerprint based on given input
 */
export async function installFingerprintAsync(
  fingerprintVersion: string,
  packager: string,
  useCache: boolean = true
): Promise<string> {
  const packageName = '@expo/fingerprint';
  const version = await resolvePackage(packageName, fingerprintVersion);
  const message = useCache
    ? `Installing ${packageName} (${version}) from cache or with ${packager}`
    : `Installing ${packageName} (${version}) with ${packager}`;

  return await group(message, async () => {
    let libRoot = findTool(packageName, version) || null;
    if (!libRoot && useCache) {
      libRoot = await restoreFromCache(packageName, version, packager);
    }
    if (!libRoot) {
      libRoot = await installPackage(packageName, version, packager);
      if (useCache) {
        await saveToCache(packageName, version, packager);
      }
    }

    installToolFromPackage(libRoot);
    addGlobalNodeSearchPath(path.join(libRoot, 'node_modules'));
    return libRoot;
  });
}

/**
 * Restore database from the remote cache.
 * This will install the tool back into the local tool cache.
 */
export async function restoreDbFromCacheAsync(cacheKey: string) {
  return restoreCacheAsync(path.dirname(await getDbPathAsync()), cacheKey);
}

/**
 * Save database to the remote cache.
 * This will fetch from the local tool cache.
 */
export async function saveDbToCacheAsync(cacheKey: string) {
  info(`Saving fingerprint database to cache: ${cacheKey}`);
  return saveCacheAsync(path.dirname(await getDbPathAsync()), cacheKey);
}

/**
 * Get the path to the fingerprint database
 */
async function getDbPathAsync(): Promise<string> {
  assert(
    process.env['RUNNER_TOOL_CACHE'],
    'Could not resolve the local tool cache, RUNNER_TOOL_CACHE not defined'
  );
  const result = path.join(
    process.env['RUNNER_TOOL_CACHE'],
    'fingerprint-storage',
    'fingerprint.db'
  );
  const dir = path.dirname(result);
  if (!(await fs.promises.stat(dir).catch(() => null))) {
    await mkdirP(dir);
  }
  return result;
}
