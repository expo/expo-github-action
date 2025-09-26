import { info } from '@actions/core';
import assert from 'node:assert';

import { executeAction } from '../actions';
import { deleteCacheAsync } from '../caches';
import { collectFingerprintActionInput, saveDbToCacheAsync } from '../fingerprint';
import { getRepoDefaultBranch, isPushBranchContext } from '../github';
import { retryAsync } from '../utils';

executeAction(runAction);

export async function runAction(input = collectFingerprintActionInput()) {
  const targetBranch = input.savingDbBranch ?? getRepoDefaultBranch();
  assert(targetBranch);
  if (!isPushBranchContext(targetBranch)) {
    return;
  }
  info(`Saving fingerprint database to ${targetBranch} branch.`);

  try {
    const ref = process.env.GITHUB_REF;
    assert(ref != null, 'GITHUB_REF is not defined');
    await deleteCacheAsync(input.githubToken, input.fingerprintDbCacheKey, ref);
  } catch (e) {
    info(`Failed to delete the cache: ${e}`);
  }
  await retryAsync(() => saveDbToCacheAsync(input.fingerprintDbCacheKey), 3);
}
