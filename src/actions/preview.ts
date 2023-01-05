import { getBooleanInput, getInput, setOutput, group } from '@actions/core';
import { info } from 'console';

import { createUpdate, getUpdateQr } from '../eas';
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
  const config = await loadProjectConfig(input.workingDirectory);
  const scheme = config.scheme || 'exp';
  const projectId = config.extra?.eas?.projectId || '';

  const command = sanitizeCommand(input.command);
  const updates = await group(`Creating preview using "eas ${command}"`, () =>
    createUpdate(input.workingDirectory, command)
  );

  const updateGroupId = updates[0].group;
  const updateAndroid = updates.find(update => update.platform === 'android');
  const updateIos = updates.find(update => update.platform === 'ios');

  const outputs: Record<string, string> = {
    // EAS specific
    easProjectId: projectId,
    // Project (expo) specific
    projectName: config.name,
    projectSlug: config.slug,
    projectFullName: config.currentFullName || '',
    // Update group
    updateGroupId,
    // Android update
    androidId: updateAndroid?.id || '',
    androidRuntimeVersion: updateAndroid?.runtimeVersion || '',
    androidQR: updateAndroid ? getUpdateQr({ projectId, updateId: updateAndroid.id, appScheme: scheme }) : '',
    androidUpdateLink: updateAndroid?.manifestPermalink || '',
    // iOS update
    iosId: updateIos?.id || '',
    iosRuntimeVersion: updateIos?.runtimeVersion || '',
    iosQR: updateIos ? getUpdateQr({ projectId, updateId: updateIos.id, appScheme: scheme }) : '',
    iosUpdateLink: updateIos?.manifestPermalink || '',
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
  setOutput('message', messageBody);
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
