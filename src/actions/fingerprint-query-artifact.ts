import { getInput, setOutput } from '@actions/core';

import { executeAction } from '../actions';
import { createFingerprintDbManagerAsync } from '../fingerprint';

executeAction(runAction);

async function runAction() {
  const fingerprintHash = getInput('fingerprint-hash', { required: true });
  const platform = getInput('platform', { required: true });
  const packager = getInput('packager');
  const fingerprintDbCacheKey = getInput('fingerprint-db-cache-key');

  const dbManager = await createFingerprintDbManagerAsync(packager, fingerprintDbCacheKey);
  const githubArtifact = await dbManager.getFirstGitHubArtifactAsync(fingerprintHash, platform);

  if (githubArtifact) {
    setOutput('artifact-id', githubArtifact.artifactId);
    setOutput('artifact-url', githubArtifact.artifactUrl);
    setOutput('run-id', githubArtifact.workflowRunId);
  } else {
    setOutput('artifact-id', '');
    setOutput('artifact-url', '');
    setOutput('run-id', '');
  }
}
