import { getBooleanInput, getInput, setOutput, group, setFailed, info } from '@actions/core';
import { ExpoConfig } from '@expo/config';

import { assertEasVersion, createUpdate, EasUpdate, getUpdateGroupQr } from '../eas';
import { createIssueComment, hasPullContext, pullContext } from '../github';
import { loadProjectConfig } from '../project';
import { template } from '../utils';
import { executeAction } from '../worker';

export const MESSAGE_ID = 'projectId:{projectId}';

export function previewInput() {
  return {
    command: getInput('command'),
    shouldComment: !getInput('comment') || getBooleanInput('comment'),
    commentId: getInput('comment-id') || MESSAGE_ID,
    workingDirectory: getInput('working-directory'),
    githubToken: getInput('github-token'),
  };
}

executeAction(previewAction);

export async function previewAction(input = previewInput()) {
  // See: https://github.com/expo/eas-cli/releases/tag/v3.3.2
  // See: https://github.com/expo/eas-cli/releases/tag/v3.4.0
  // We need the revised `eas update --json` output to parse the update information.
  await assertEasVersion('>=3.4.0');

  // Create the update before loading project information.
  // When the project needs to be set up, EAS project ID won't be available before this command.
  const command = sanitizeCommand(input.command);
  const updates = await group(`Creating preview using "eas ${command}"`, () =>
    createUpdate(input.workingDirectory, command)
  );

  const update = updates.find(update => !!update);
  if (!update) {
    return setFailed(`No update found in command output.`);
  }

  const config = await loadProjectConfig(input.workingDirectory);
  if (!config.extra?.eas?.projectId) {
    return setFailed(`Missing 'extra.eas.projectId' in app.json or app.config.js.`);
  }

  const variables = getVariables(config, updates);
  const messageId = template(input.commentId, variables);
  const messageBody = getMessage(updates, variables);

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

  for (const [name, value] of Object.entries(variables)) {
    setOutput(name, value);
  }

  setOutput('messageId', messageId);
  setOutput('messageBody', messageBody);
}

/**
 * Validate and sanitize the command that creates the update.
 * This ensures that both `--json` and `--non-interactive` flags are present.
 * It also ensures that the command starts with `eas ...` to make sure we can run it.
 */
function sanitizeCommand(input: string): string {
  let command = input.trim();

  if (!command.startsWith('eas')) {
    throw new Error(`The command must start with "eas", received "${command}"`);
  } else {
    command = command.replace(/^eas/, '').trim();
  }

  if (!command.includes('--json')) {
    command += ' --json';
  }

  if (!command.includes('--non-interactive')) {
    command += ' --non-interactive';
  }

  return command;
}

/**
 * Generate useful variables for the message body, and as step outputs.
 */
export function getVariables(config: ExpoConfig, updates: EasUpdate[]) {
  const projectId: string = config.extra?.eas?.projectId;
  const android = updates.find(update => update.platform === 'android');
  const ios = updates.find(update => update.platform === 'ios');

  return {
    // EAS / Expo specific
    projectId,
    projectName: config.name,
    projectSlug: config.slug,
    // Shared update properties
    // Note, only use these properties when the update groups are identical
    groupId: updates[0].group,
    runtimeVersion: updates[0].runtimeVersion,
    qr: getUpdateGroupQr({ projectId, updateGroupId: updates[0].group, appScheme: config.scheme }),
    // These are safe to access regardless of the update groups
    branchName: updates[0].branch,
    message: updates[0].message,
    createdAt: updates[0].createdAt,
    gitCommitHash: updates[0].gitCommitHash,
    // Android update
    androidId: android?.id || '',
    androidGroupId: android?.group || '',
    androidBranchName: android?.branch || '',
    androidMessage: android?.message || '',
    androidRuntimeVersion: android?.runtimeVersion || '',
    androidQR: android ? getUpdateGroupQr({ projectId, updateGroupId: android.group, appScheme: config.scheme }) : '',
    // iOS update
    iosId: ios?.id || '',
    iosGroupId: ios?.group || '',
    iosBranchName: ios?.branch || '',
    iosMessage: ios?.message || '',
    iosRuntimeVersion: ios?.runtimeVersion || '',
    iosQR: ios ? getUpdateGroupQr({ projectId, updateGroupId: ios.group, appScheme: config.scheme }) : '',
  };
}

/**
 * Generate the message body for a single update.
 * Note, this is not configurable, but you can use the variables used to construct your own.
 */
export function getMessage(updates: EasUpdate[], vars: ReturnType<typeof getVariables>) {
  /* eslint-disable prettier/prettier */

  // If all updates are in the same group, we can unify QR codes
  if (updates.every(update => update.group === updates[0].group)) {
    return `🚀 Expo preview is ready!

- Project → **${vars.projectSlug}**
- Platform${updates.length === 1 ? '' : 's'} → ${updates.map(update => `**${update.platform}**`).join(', ')}
- Runtime Version → **${vars.runtimeVersion}**

<a href="${vars.qr}"><img src="${vars.qr}" width="250px" height="250px" /></a>

> Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action#publish-a-preview-from-pr)`;
  }

  // If the updates are in different groups, we need to split the QR codes
  return `🚀 Expo preview is ready!

- Project → **${vars.projectSlug}**

Android <br /> ${vars.androidId ? `_(${vars.androidRuntimeVersion})_` : ''} | iOS <br /> ${vars.iosId ? `_(${vars.iosRuntimeVersion})_` : ''}
--- | ---
${vars.androidId ? `<a href="${vars.androidQR}"><img src="${vars.androidQR}" width="250px" height="250px" /></a>` : '_not created_'} | ${vars.iosId ? `<a href="${vars.iosQR}"><img src="${vars.iosQR}" width="250px" height="250px" /></a>` : '_not created_'}

> Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action#publish-a-preview-from-pr)`;
}
