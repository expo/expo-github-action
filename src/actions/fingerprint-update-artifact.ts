import { getInput } from '@actions/core';
import * as github from '@actions/github';
import { type Fingerprint as FingerprintType } from '@expo/fingerprint';
import assert from 'node:assert';

import { executeAction } from '../actions';
import { FingerprintDbManager, createFingerprintDbManagerAsync } from '../fingerprint';

executeAction(runAction);

async function runAction() {
  const currentGitCommitHash = getInput('current-git-commit', { required: true });
  const currentFingerprint = getInput('current-fingerprint', { required: true });
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
    fingerprint: currentFingerprint,
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
  fingerprint: string;
  platform: string;
  githubArtifact: {
    artifactId: string;
    artifactUrl: string;
    artifactDigest: string;
    workflowRunId: string;
    platform: string;
  };
}) {
  const fingerprint = JSON.parse(params.fingerprint) as FingerprintType;
  await params.dbManager.upsertFingerprintByGitCommitHashAsync(params.gitCommitHash, {
    fingerprint,
  });
  const fingerprintEntity = await params.dbManager.getEntityFromGitCommitHashAsync(
    params.gitCommitHash
  );
  assert(fingerprintEntity, 'Fingerprint entity should exist after upsert');

  const artifactsManager = params.dbManager.getArtifactsManager();
  await artifactsManager.insertArtifactAsync({
    fingerprintId: fingerprintEntity.id,
    artifactId: params.githubArtifact.artifactId,
    artifactUrl: params.githubArtifact.artifactUrl,
    artifactDigest: params.githubArtifact.artifactDigest,
    workflowRunId: params.githubArtifact.workflowRunId,
    platform: params.githubArtifact.platform,
  });
}
