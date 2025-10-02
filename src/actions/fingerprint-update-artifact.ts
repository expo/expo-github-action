import { getInput, info } from '@actions/core';
import * as github from '@actions/github';

import { executeAction } from '../actions';
import { FingerprintDbManager, createFingerprintDbManagerAsync } from '../fingerprint';

executeAction(runAction);

async function runAction() {
  const currentGitCommitHash = getInput('current-git-commit', { required: true });
  const platform = getInput('platform', { required: true });
  const artifactId = getInput('artifact-id', { required: true });
  const artifactUrl = getInput('artifact-url', { required: true });
  const artifactDigest = getInput('artifact-digest', { required: true });
  const packager = getInput('packager');
  const fingerprintDbCacheKey = getInput('fingerprint-db-cache-key');

  const dbManager = await createFingerprintDbManagerAsync(packager, fingerprintDbCacheKey);

  await updateFingerprintDbAsync({
    dbManager,
    fingerprintDbCacheKey,
    gitCommitHash: currentGitCommitHash,
    platform,
    githubArtifact: {
      artifactId,
      artifactUrl,
      artifactDigest,
      workflowRunId: String(github.context.runId),
      platform,
    },
  });
}

async function updateFingerprintDbAsync(params: {
  dbManager: FingerprintDbManager;
  fingerprintDbCacheKey: string;
  gitCommitHash: string;
  platform: string;
  githubArtifact: {
    artifactId: string;
    artifactUrl: string;
    artifactDigest: string;
    workflowRunId: string;
    platform: string;
  };
}) {
  const fingerprint = await params.dbManager.getEntityFromGitCommitHashAsync(params.gitCommitHash);
  if (!fingerprint) {
    info(`No fingerprint found for git commit hash: ${params.gitCommitHash}`);
    return;
  }

  const artifactsManager = params.dbManager.getArtifactsManager();
  await artifactsManager.insertArtifactAsync({
    fingerprintId: fingerprint.id,
    artifactId: params.githubArtifact.artifactId,
    artifactUrl: params.githubArtifact.artifactUrl,
    artifactDigest: params.githubArtifact.artifactDigest,
    workflowRunId: params.githubArtifact.workflowRunId,
    platform: params.githubArtifact.platform,
  });
}
