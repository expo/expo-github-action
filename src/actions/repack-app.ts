import { DefaultArtifactClient } from '@actions/artifact';
import { info, isDebug, saveState, setOutput, warning } from '@actions/core';
import * as github from '@actions/github';
import spawnAsync from '@expo/spawn-async';
import { glob } from 'glob';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import { createFingerprintDbManagerAsync, createFingerprintOutputAsync } from '../fingerprint';
import { collectRepackAppActionInput } from '../repack/inputs';
import { executeAction } from '../worker';

executeAction(runAction);

async function runAction(input = collectRepackAppActionInput()) {
  // Set default outputs first and override them later if needed
  saveState('isRepackExecuted', false);
  setOutput('fingerprint-hit', false);

  const dbManager = await createFingerprintDbManagerAsync(
    input.packager,
    input.fingerprintDbCacheKey
  );
  const { currentFingerprint } = await createFingerprintOutputAsync(dbManager, input);
  const entity = await dbManager.getFirstEntityWithGitHubArtifactFromFingerprintHashAsync(
    currentFingerprint.hash
  );
  saveState('fingerprint', JSON.stringify(currentFingerprint));
  const githubArtifact = entity?.githubArtifact;
  if (githubArtifact == null) {
    info(
      'No existing artifact entity with compatible fingerprint found, exiting for custom build.'
    );
    return;
  }

  setOutput('fingerprint-hit', true);
  const artifactClient = new DefaultArtifactClient();
  let downloadPath: string | undefined;
  assert(process.env['RUNNER_TEMP'], 'Could not resolve temporary path, RUNNER_TEMP not defined');
  const downloadDir = await fs.promises.mkdtemp(path.join(process.env['RUNNER_TEMP'], 'repack-'));

  try {
    const downloadResponse = await artifactClient.downloadArtifact(
      Number(githubArtifact.artifactId),
      {
        path: downloadDir,
        findBy: {
          token: input.githubToken,
          workflowRunId: Number(githubArtifact.workflowRunId),
          repositoryOwner: github.context.repo.owner,
          repositoryName: github.context.repo.repo,
        },
      }
    );
    downloadPath = downloadResponse.downloadPath;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    warning(`Failed to download the artifact: ${message}`);
  }
  if (!downloadPath) {
    info(
      `Exiting because no download path found for the artifact - artifactId[${githubArtifact.artifactId}]`
    );
    return;
  }
  info(`Downloaded artifact - downloadPath[${downloadPath}]`);

  let uploadPathStat: fs.Stats | null;
  try {
    uploadPathStat = await fs.promises.stat(input.uploadPath);
  } catch {
    uploadPathStat = null;
  }
  if (uploadPathStat != null && !uploadPathStat.isDirectory()) {
    throw new Error(`The 'uploadPath' must be a directory: ${input.uploadPath}`);
  }
  await fs.promises.mkdir(input.uploadPath, { recursive: true });

  const sourceAppPath = await findSourceAppPathAsync(downloadPath);
  const filename = path.basename(sourceAppPath);
  const outputPath = path.join(input.uploadPath, filename);
  info(`Repacking app - sourceAppPath[${sourceAppPath}] outputPath[${outputPath}]`);
  const repackArgs: string[] = [
    `@expo/repack-app@${input.repackVersion}`,
    '--platform',
    input.platform,
    '--source-app',
    sourceAppPath,
    '--output',
    outputPath,
  ];
  if (isDebug()) {
    repackArgs.push('--verbose');
  }
  await spawnAsync('npx', repackArgs, {
    cwd: input.workingDirectory,
    stdio: 'inherit',
  });
  info(`Repacked app created at ${outputPath}`);
  saveState('isRepackExecuted', true);
}

async function findSourceAppPathAsync(downloadPath: string): Promise<string> {
  const files = await glob('**/*', {
    cwd: downloadPath,
    maxDepth: 1,
    absolute: true,
  });
  assert(files.length === 1, `Expected exactly one file in the artifact, found: ${files.length}`);
  return files[0];
}
