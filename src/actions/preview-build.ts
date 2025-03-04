import { getBooleanInput, getInput, group, info, setFailed, setOutput } from '@actions/core';
import { context } from '@actions/github';
import type { ExpoConfig } from '@expo/config';
import type { Fingerprint, FingerprintDiffItem } from '@expo/fingerprint';
import assert from 'assert';
import { validate as isValidUUID } from 'uuid';

import { deleteCacheAsync } from '../cacher';
import { createDetails } from '../comment';
import {
  BuildInfo,
  appPlatformEmojis,
  cancelEasBuildAsync,
  createEasBuildFromRawCommandAsync,
  getBuildLogsUrl,
  queryEasBuildInfoAsync,
} from '../expo';
import {
  FingerprintDbManager,
  collectFingerprintActionInput,
  createFingerprintDbManagerAsync,
  createFingerprintOutputAsync,
  saveDbToCacheAsync,
} from '../fingerprint';
import {
  createIssueComment,
  fetchIssueComment,
  getGitCommandMessageAsync,
  getPullRequestFromGitCommitShaAsync,
  getRepoDefaultBranch,
  hasPullContext,
  isPushBranchContext,
  pullContext,
} from '../github';
import { loadProjectConfig } from '../project';
import { retryAsync, template } from '../utils';
import { executeAction } from '../worker';

export const MESSAGE_ID = 'projectId:previewBuild:{projectId}';

export function collectPreviewBuildActionInput() {
  return {
    ...collectFingerprintActionInput(),
    command: getInput('command'),
    shouldComment: !getInput('comment') || getBooleanInput('comment'),
    commentId: getInput('comment-id') || MESSAGE_ID,
    easBuildMessage: getInput('eas-build-message'),
  };
}

executeAction(previewAction);

export async function previewAction(input = collectPreviewBuildActionInput()) {
  const config = await loadProjectConfig(input.workingDirectory, null);
  if (!config.extra?.eas?.projectId) {
    return setFailed(
      'Missing "extra.eas.projectId" in app.json or app.config.js. Please run `eas build:configure` first.'
    );
  }

  if (!hasPullContext()) {
    handleNonPullRequest(config, input);
    return;
  }

  const dbManager = await createFingerprintDbManagerAsync(
    input.packager,
    input.fingerprintDbCacheKey
  );
  const { currentFingerprint, diff } = await createFingerprintOutputAsync(dbManager, input);
  if (diff.length === 0) {
    info('Fingerprint is compatible, no new builds are required.');
    await maybeUpdateFingerprintDbAsync({
      dbManager,
      githubToken: input.githubToken,
      fingerprintDbCacheKey: input.fingerprintDbCacheKey,
      savingDbBranch: input.savingDbBranch,
      gitCommitHash: input.currentGitCommitHash,
      manyBuilds: [{ fingerprint: currentFingerprint }],
    });
    await maybeCancelPreviousBuildsAsync(config, input);
    const variables = getVariables(config, []);
    const messageId = template(input.commentId, variables);
    const latestEasEntity = await dbManager.getLatestEasEntityFromFingerprintAsync(
      currentFingerprint.hash
    );
    const latestEasBuildInfo = latestEasEntity?.easBuildId
      ? await queryEasBuildInfoAsync(input.workingDirectory, latestEasEntity.easBuildId)
      : null;
    const messageBody = createMessageBodyFingerprintCompatible(latestEasBuildInfo);
    await maybeCreateCommentAsync(input, messageId, messageBody);
    setOutputs(variables, messageId, messageBody);
    return;
  }

  info('Fingerprint is changed, creating new builds...');
  info(`Fingerprint diff: ${JSON.stringify(diff, null, 2)}`);
  await maybeCancelPreviousBuildsAsync(config, input);
  const command = sanitizeCommand(input.command);
  const buildMessage =
    input.easBuildMessage ||
    (await getGitCommandMessageAsync({ token: input.githubToken }, input.currentGitCommitHash));
  const args = ['--message', buildMessage];
  const builds = await group(`Run eas ${command}"`, () =>
    createEasBuildFromRawCommandAsync(input.workingDirectory, command, args)
  );

  await maybeUpdateFingerprintDbAsync({
    dbManager,
    githubToken: input.githubToken,
    fingerprintDbCacheKey: input.fingerprintDbCacheKey,
    savingDbBranch: input.savingDbBranch,
    gitCommitHash: input.currentGitCommitHash,
    manyBuilds: builds.map(build => ({
      easBuildId: build.id,
      fingerprint: currentFingerprint,
    })),
  });
  const variables = getVariables(config, builds);
  const messageId = template(input.commentId, variables);
  const messageBody = createMessageBodyInBuilding(builds, diff, input);
  await maybeCreateCommentAsync(input, messageId, messageBody);
  setOutputs(variables, messageId, messageBody);
}

/**
 * Validate and sanitize the command that creates the update.
 * It also ensures that the command starts with `eas ...` to make sure we can run it.
 */
function sanitizeCommand(input: string): string {
  let command = input.trim();

  if (!command.startsWith('eas')) {
    throw new Error(`The command must start with "eas", received "${command}"`);
  } else {
    command = command.replace(/^eas/, '').trim();
  }
  return command;
}

async function maybeCancelPreviousBuildsAsync(
  config: ExpoConfig,
  input: ReturnType<typeof collectPreviewBuildActionInput>
) {
  const variables = getVariables(config, []);
  const messageId = template(input.commentId, variables);
  const comment = await fetchIssueComment({
    ...pullContext(),
    token: input.githubToken,
    id: messageId,
  });
  if (!comment?.body) {
    return [];
  }
  const easBuildIds = parseCommentForEasMetadata(comment.body);
  for (const buildId of easBuildIds) {
    info(`Canceling previous build: ${buildId}`);
    await cancelEasBuildAsync(input.workingDirectory, buildId);
  }
}

//#region Comments

async function maybeCreateCommentAsync(
  input: ReturnType<typeof collectPreviewBuildActionInput>,
  messageId: string,
  messageBody: string
) {
  if (!input.shouldComment) {
    info(`Skipped comment: 'comment' is disabled`);
  } else if (!hasPullContext()) {
    info(`Skipped comment: action was not ran from a pull request`);
  } else {
    await createIssueComment({
      ...pullContext(),
      token: input.githubToken,
      id: messageId,
      body: messageBody,
    });
  }
}

function setOutputs(
  variables: ReturnType<typeof getVariables>,
  messageId: string,
  messageBody: string
) {
  for (const [name, value] of Object.entries(variables)) {
    setOutput(name, value);
  }
  setOutput('commentId', messageId);
  setOutput('comment', messageBody);
}

/**
 * Generate useful variables for the message body, and as step outputs.
 */
export function getVariables(config: ExpoConfig, builds: BuildInfo[]) {
  const projectId: string = config.extra?.eas?.projectId;
  const android = builds.find(build => build.platform === 'ANDROID');
  const ios = builds.find(build => build.platform === 'IOS');

  const gitCommitHash = android?.gitCommitHash || ios?.gitCommitHash || '';

  return {
    projectId,
    gitCommitHash,
    androidBuildId: android?.id || '',
    androidLink: android != null ? getBuildLogsUrl(android) : '',
    androidAppVersion: android?.appVersion || '',
    iosBuildId: ios?.id || '',
    iosLink: ios != null ? getBuildLogsUrl(ios) : '',
    iosAppVersion: ios?.appVersion || '',
  };
}

function createMessageBodyInBuilding(
  builds: BuildInfo[],
  fingerprintDiff: FingerprintDiffItem[],
  input: ReturnType<typeof collectPreviewBuildActionInput>
) {
  const tableRows: string[] = [];
  for (const build of builds) {
    let name;
    if (build.platform === 'ANDROID') {
      name = `${appPlatformEmojis.ANDROID} Android build`;
    } else if (build.platform === 'IOS') {
      name = `${appPlatformEmojis.IOS} iOS build`;
    } else {
      name = 'Unknown build';
    }

    const buildPageURL = getBuildLogsUrl(build);
    const details = createDetails({
      summary: 'Details',
      details: [
        `Distribution: \`${build.distribution}\``,
        `Build profile: \`${build.buildProfile}\``,
        `SDK version: \`${build.sdkVersion}\``,
        `App version: \`${build.appVersion}\``,
      ].join('<br>'),
      delim: '',
    });

    tableRows.push(`| ${name} | [View build page](${buildPageURL}) | ${details} |`);
  }

  return [
    createCommentForEasMetadata(builds),
    '',
    `Fingerprint is changed, new EAS Build(s) are now in pipeline.`,
    '',
    `Build with commit ${input.currentGitCommitHash}`,
    '',
    '| Name | Build | Details |',
    '| :-- | :-- | :-- |',
    ...tableRows,
    '',
    createDetails({
      summary: 'Fingerprint diff',
      details: ['```json', JSON.stringify(fingerprintDiff, null, 2), '```'].join('\n'),
    }),
    '',
    `> Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview-build#example-workflows)`,
  ].join('\n');
}

function createMessageBodyFingerprintCompatible(latestEasBuildInfo: BuildInfo | null) {
  const easBuildMessage =
    latestEasBuildInfo != null
      ? `Latest compatible build on EAS found. You can download the build from the [EAS build page](${getBuildLogsUrl(
          latestEasBuildInfo
        )}).`
      : '';
  return [
    `Fingerprint is compatible, no new builds are required.`,
    easBuildMessage,
    '',
    `> Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview-build#example-workflows)`,
  ].join('\n');
}

function createCommentForEasMetadata(builds: BuildInfo[]) {
  if (builds.length === 0) {
    return '';
  }
  const easBuildIds = JSON.stringify(builds.map(build => build.id));
  return `<!-- EAS_BUILD_IDS=${easBuildIds} -->`;
}

function parseCommentForEasMetadata(comment: string): string[] {
  const match = comment.match(/<!-- EAS_BUILD_IDS=(.*) -->/);
  if (match == null) {
    return [];
  }
  let metadata;
  try {
    metadata = JSON.parse(match[1]);
  } catch {}
  if (Array.isArray(metadata)) {
    return metadata
      .map(value => (typeof value === 'string' && isValidUUID(value) ? value : null))
      .filter((value): value is string => !!value);
  }
  return [];
}

//#endregion

async function maybeUpdateFingerprintDbAsync(params: {
  dbManager: FingerprintDbManager;
  githubToken: string;
  fingerprintDbCacheKey: string;
  gitCommitHash: string;
  savingDbBranch: string | undefined;
  manyBuilds: {
    easBuildId?: string;
    fingerprint: Fingerprint;
  }[];
}) {
  const targetBranch = params.savingDbBranch ?? getRepoDefaultBranch();
  assert(targetBranch);
  if (!isPushBranchContext(targetBranch)) {
    return;
  }

  for (const build of params.manyBuilds) {
    await params.dbManager.upsertFingerprintByGitCommitHashAsync(params.gitCommitHash, {
      easBuildId: build.easBuildId,
      fingerprint: build.fingerprint,
    });
  }
  try {
    const ref = process.env.GITHUB_REF;
    assert(ref != null, 'GITHUB_REF is not defined');
    await deleteCacheAsync(params.githubToken, params.fingerprintDbCacheKey, ref);
  } catch (e) {
    info(`Failed to delete the cache: ${e}`);
  }
  await retryAsync(() => saveDbToCacheAsync(params.fingerprintDbCacheKey), 3);
}

//#region Non pull request context

async function handleNonPullRequest(
  config: ExpoConfig,
  input: ReturnType<typeof collectPreviewBuildActionInput>
) {
  info('Non pull request context, skipping comment.');
  const targetBranch = input.savingDbBranch ?? getRepoDefaultBranch();
  assert(targetBranch);
  if (!isPushBranchContext(targetBranch)) {
    return;
  }

  info(`Updating fingerprint database for the ${targetBranch} branch push event.`);
  const dbManager = await createFingerprintDbManagerAsync(
    input.packager,
    input.fingerprintDbCacheKey
  );
  const { currentFingerprint } = await createFingerprintOutputAsync(dbManager, input);
  const associatedPRs = await getPullRequestFromGitCommitShaAsync(
    { token: input.githubToken },
    input.currentGitCommitHash
  );
  const easBuildIds = (
    await Promise.all(
      associatedPRs.map(pr => queryEasBuildIdsFromPrAsync(pr.prNumber, config, input))
    )
  ).flat();

  let manyBuilds: { easBuildId?: string; fingerprint: Fingerprint }[];
  if (easBuildIds.length > 0) {
    manyBuilds = easBuildIds.map(easBuildId => ({
      easBuildId,
      fingerprint: currentFingerprint,
    }));
    info(`Found EAS build IDs in associated PRs: ${easBuildIds.join(', ')}`);
  } else {
    manyBuilds = [{ fingerprint: currentFingerprint }];
    info(
      'No EAS build IDs found in associated PRs, creating a fingerprint entry without EAS build ID.'
    );
  }

  await maybeUpdateFingerprintDbAsync({
    dbManager,
    githubToken: input.githubToken,
    fingerprintDbCacheKey: input.fingerprintDbCacheKey,
    savingDbBranch: input.savingDbBranch,
    gitCommitHash: input.currentGitCommitHash,
    manyBuilds,
  });
  const variables = getVariables(config, []);
  setOutputs(variables, '', '');
}

async function queryEasBuildIdsFromPrAsync(
  prNumber: number,
  config: ExpoConfig,
  input: ReturnType<typeof collectPreviewBuildActionInput>
): Promise<string[]> {
  const variables = getVariables(config, []);
  const messageId = template(input.commentId, variables);
  const comment = await fetchIssueComment({
    ...context.repo,
    number: prNumber,
    token: input.githubToken,
    id: messageId,
  });
  if (!comment?.body) {
    return [];
  }
  return parseCommentForEasMetadata(comment.body);
}

//#endregion
