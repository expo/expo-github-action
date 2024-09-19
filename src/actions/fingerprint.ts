import { setOutput } from '@actions/core';

import {
  collectFingerprintActionInput,
  createFingerprintDbManagerAsync,
  createFingerprintOutputAsync,
} from '../fingerprint';
import { executeAction } from '../worker';

executeAction(runAction);

export async function runAction(input = collectFingerprintActionInput()) {
  const dbManager = await createFingerprintDbManagerAsync(
    input.packager,
    input.fingerprintDbCacheKey
  );
  const { currentFingerprint, previousFingerprint, diff } = await createFingerprintOutputAsync(
    dbManager,
    input
  );
  await dbManager.upsertFingerprintByGitCommitHashAsync(input.currentGitCommitHash, {
    fingerprint: currentFingerprint,
  });

  setOutput('previous-fingerprint', previousFingerprint);
  setOutput('current-fingerprint', currentFingerprint);
  setOutput('previous-git-commit', input.previousGitCommitHash);
  setOutput('current-git-commit', input.currentGitCommitHash);
  setOutput('fingerprint-diff', diff);
}
