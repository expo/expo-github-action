import { getBooleanInput, getInput, setOutput, group, setFailed, info } from '@actions/core';

import { assertEasVersion, createUpdate, getUpdateGroupQr } from '../eas';
import { createIssueComment, pullContext } from '../github';
import { loadProjectConfig } from '../project';
import { templateLiteral } from '../utils';
import { executeAction } from '../worker';

export const DEFAULT_ID = 'projectId:${projectId} projectDir:${projectDir}';
export const DEFAULT_MESSAGE = // TODO
  `This pull request was automatically deployed using [Expo GitHub Actions](https://github.com/expo/expo-github-action/tree/main/preview-comment)!\n` +
  `\n- Project: **@{projectOwner}/{projectSlug}**` +
  `\n- Channel: **{channel}**` +
  `\n\n<a href="{projectQR}"><img src="{projectQR}" height="200px" width="200px"></a>`;

export function previewInput() {
  return {
    command: getInput('command'),
    shouldComment: !getInput('comment') || getBooleanInput('comment'),
    message: getInput('message') || DEFAULT_MESSAGE,
    messageId: getInput('message-id') || DEFAULT_ID,
    workingDirectory: getInput('working-directory'),
    githubToken: getInput('github-token'),
  };
}

executeAction(previewAction);

export async function previewAction(input = previewInput()) {
  // See: https://github.com/expo/eas-cli/releases/tag/v3.3.2
  // See: https://github.com/expo/eas-cli/releases/tag/v3.4.0
  // We need the revised `eas update --json` output to parse the update information.
  assertEasVersion('>=3.4.0');

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
  const scheme = config.scheme;
  const projectId = config.extra?.eas?.projectId;
  if (!projectId) {
    return setFailed(`Missing 'extra.eas.projectId' in app.json or app.config.js.`);
  }

  const updateAndroid = updates.find(update => update.platform === 'android');
  const updateIos = updates.find(update => update.platform === 'ios');
  const hasSingleUpdateGroup = updates.every(platform => platform.group === update.group);

  const outputs: Record<string, string> = {
    // Template specific
    templateType: hasSingleUpdateGroup ? 'single' : 'multiple',
    // EAS / Expo specific
    projectId,
    projectName: config.name,
    projectSlug: config.slug,
    // Shared update properties
    // Note, only use these properties when the update groups are identical
    updateId: update.id,
    groupId: update.group,
    branchName: update.branch,
    message: update.message,
    runtimeVersion: update.runtimeVersion,
    qr: getUpdateGroupQr({ updateGroupId: update.group, appScheme: scheme }),
    // These are safe to access regardless of the update groups
    createdAt: update.createdAt,
    gitCommitHash: update.gitCommitHash,
    // Android update
    androidUpdateId: updateAndroid?.id || '',
    androidGroupId: updateAndroid?.group || '',
    androidBranchName: updateAndroid?.branch || '',
    androidMessage: updateAndroid?.message || '',
    androidRuntimeVersion: updateAndroid?.runtimeVersion || '',
    androidQR: updateAndroid ? getUpdateGroupQr({ updateGroupId: updateAndroid.group, appScheme: scheme }) : '',
    // iOS update
    iosUpdateId: updateIos?.id || '',
    iosGroupId: updateIos?.group || '',
    iosBranchName: updateIos?.branch || '',
    iosMessage: updateIos?.message || '',
    iosRuntimeVersion: updateIos?.runtimeVersion || '',
    iosQR: updateIos ? getUpdateGroupQr({ updateGroupId: updateIos.group, appScheme: scheme }) : '',
  };

  const messageId = templateLiteral(input.messageId, { ...outputs, projectDir: input.workingDirectory });
  const messageBody = templateLiteral(input.message, { ...outputs, projectDir: input.workingDirectory });

  if (!input.shouldComment) {
    info(`Skipped comment: 'comment' is disabled`);
  } else {
    await createIssueComment({
      ...pullContext(),
      token: input.githubToken,
      id: messageId,
      body: messageBody,
    });
  }

  for (const name in outputs) {
    setOutput(name, outputs[name]);
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
