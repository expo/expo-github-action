import { DefaultArtifactClient } from '@actions/artifact';
import { getState, info } from '@actions/core';
import * as github from '@actions/github';
import type { Fingerprint } from '@expo/fingerprint';
import { glob } from 'glob';
import assert from 'node:assert';
import path from 'node:path';

import { deleteCacheAsync } from '../cacher';
import {
  FingerprintDbManager,
  createFingerprintDbManagerAsync,
  saveDbToCacheAsync,
} from '../fingerprint';
import { getRepoDefaultBranch, isPushBranchContext } from '../github';
import { collectRepackAppActionInput } from '../repack/inputs';
import { retryAsync } from '../utils';
import { executeAction } from '../worker';

executeAction(runAction);

async function runAction(input = collectRepackAppActionInput()) {
  const isRepackExecuted = getState('isRepackExecuted') === 'true';
  info(`isRepackExecuted: ${isRepackExecuted}`);
  const fingerprintState = getState('fingerprint');
  assert(
    fingerprintState,
    'Fingerprint state is not found. Make sure to run repack-app before repack-app-post.'
  );
  const currentFingerprint = JSON.parse(fingerprintState) as Fingerprint;

  const uploadPath = path.resolve(input.workingDirectory, input.uploadPath);
  info(`Uploading the artifact from path: ${uploadPath}`);
  const artifactClient = new DefaultArtifactClient();
  const files = await glob('**/*', {
    cwd: uploadPath,
    absolute: true,
  });
  for (const file of files) {
    info(`Found file to upload: ${file}`);
  }
  const uploadResponse = await artifactClient.uploadArtifact(
    input.artifactName,
    files,
    uploadPath,
    {
      retentionDays: Number(input.retentionDays),
      compressionLevel: Number(input.compressionLevel),
    }
  );

  if (uploadResponse.id == null || uploadResponse.digest == null) {
    info('No artifact was uploaded, skipping updating the fingerprint database.');
    return;
  }

  // Constructing the artifact URL manually as @actions/artifact doesn't provide it
  // https://github.com/actions/upload-artifact/blob/de65e23aa2b7e23d713bb51fbfcb6d502f8667d8/src/shared/upload-artifact.ts#L24-L25
  const repository = github.context.repo;
  const artifactUrl = `${github.context.serverUrl}/${repository.owner}/${repository.repo}/actions/runs/${github.context.runId}/artifacts/${uploadResponse.id}`;
  info(
    `Artifact uploaded - artifactUrl[${artifactUrl}] artifactId[${uploadResponse.id}] digest[${uploadResponse.digest}]`
  );

  const targetBranch = input.savingDbBranch ?? getRepoDefaultBranch();
  assert(targetBranch);
  if (isPushBranchContext(targetBranch)) {
    info(`Saving fingerprint database to ${targetBranch} branch.`);
    const dbManager = await createFingerprintDbManagerAsync(
      input.packager,
      input.fingerprintDbCacheKey
    );
    await updateFingerprintDbAsync({
      dbManager,
      githubToken: input.githubToken,
      fingerprintDbCacheKey: input.fingerprintDbCacheKey,
      gitCommitHash: input.currentGitCommitHash,
      fingerprint: currentFingerprint,
      githubArtifact: {
        artifactId: String(uploadResponse.id),
        artifactUrl,
        artifactDigest: uploadResponse.digest,
        workflowRunId: String(github.context.runId),
      },
    });
  }
}

async function updateFingerprintDbAsync(params: {
  dbManager: FingerprintDbManager;
  githubToken: string;
  fingerprintDbCacheKey: string;
  gitCommitHash: string;
  fingerprint: Fingerprint;
  githubArtifact?: {
    artifactId: string;
    artifactUrl: string;
    artifactDigest: string;
    workflowRunId: string;
  };
}) {
  await params.dbManager.upsertFingerprintByGitCommitHashAsync(params.gitCommitHash, {
    fingerprint: params.fingerprint,
    githubArtifact: params.githubArtifact,
  });
  try {
    const ref = process.env.GITHUB_REF;
    assert(ref != null, 'GITHUB_REF is not defined');
    await deleteCacheAsync(params.githubToken, params.fingerprintDbCacheKey, ref);
  } catch (e) {
    info(`Failed to delete the cache: ${e}`);
  }
  await retryAsync(() => saveDbToCacheAsync(params.fingerprintDbCacheKey), 3);
}
