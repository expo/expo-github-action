import { info } from '@actions/core';
import assert from 'assert';

import { deleteCacheAsync } from '../cacher';
import { collectFingerprintActionInput, saveDbToCacheAsync } from '../fingerprint';
import { isPushDefaultBranchContext } from '../github';
import { executeAction } from '../worker';

executeAction(runAction);

export async function runAction(input = collectFingerprintActionInput()) {
  if (!isPushDefaultBranchContext()) {
    return;
  }

  try {
    const ref = process.env.GITHUB_REF;
    assert(ref != null, 'GITHUB_REF is not defined');
    await deleteCacheAsync(input.githubToken, input.fingerprintDbCacheKey, ref);
  } catch (e) {
    info(`Failed to delete the cache: ${e}`);
  }
  await saveDbToCacheAsync(input.fingerprintDbCacheKey);
}
