import { setOutput } from '@actions/core';

import {
  createFingerprintOutputAsync,
  collectFingerprintActionInput,
  createFingerprintDbManagerAsync,
} from '../fingerprint';
import { executeAction } from '../worker';

executeAction(runAction);

export async function runAction(input = collectFingerprintActionInput()) {
  const dbManager = await createFingerprintDbManagerAsync(input.packager, input.fingerprintDbCacheKey);
  const { currentFingerprint, diff } = await createFingerprintOutputAsync(dbManager, input);
  await dbManager.upsertFingerprintByGitCommitHashAsync(input.currentGitCommitHash, {
    fingerprint: currentFingerprint,
  });

  setOutput('fingerprint-diff', diff);
}
