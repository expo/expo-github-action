import { getBooleanInput, getInput, info, setOutput } from '@actions/core';

import { createEasQr, lastUpdate, projectDeepLink, projectInfo, projectLink, projectOwner, projectQR } from '../expo';
import { createIssueComment, pullContext } from '../github';
import { template } from '../utils';
import { executeAction } from '../worker';

export type UpdateInput = ReturnType<typeof updateInput>;

export const DEFAULT_ID = `app:@{projectOwner}/{projectSlug} channel:{channel}`;

export const DEFAULT_MESSAGE_FOR_UPDATE =
  `This pull request was automatically deployed using [Expo GitHub Actions](https://github.com/expo/expo-github-action/tree/main/preview-comment)!\n` +
  `\n- Project: **@{projectOwner}/{projectSlug}**` +
  `\n- Branch: **{channel}**`;

export const DEFAULT_SYSTEM_QR = `\n\n For {system}: \n <a href="{qr}"><img src="{qr}" height="200px" width="200px"></a>`;

export const updateInput = () => {
  return {
    channel: getInput('channel') || 'default',
    comment: !getInput('comment') || getBooleanInput('comment'),
    message: getInput('message') || DEFAULT_MESSAGE_FOR_UPDATE,
    messageId: getInput('message-id') || DEFAULT_ID,
    project: getInput('project'),
    githubToken: getInput('github-token'),
    ios: getBooleanInput('is-ios-build') || true,
    android: getBooleanInput('is-android-build') || true,
  };
};

export async function updateAction(input: UpdateInput = updateInput()) {
  const project = await projectInfo(input.project);
  if (!project.owner) {
    project.owner = await projectOwner();
  }
  if (!input.channel) {
    throw new Error("'channel' variable is needed");
  }

  const variables: Record<string, string> = {
    projectLink: projectLink(project, input.channel),
    projectDeepLink: projectDeepLink(project, input.channel),
    projectName: project.name,
    projectOwner: project.owner || '',
    projectSlug: project.slug,
    projectQR: projectQR(project, input.channel),
    channel: input.channel,
  };

  const update = await lastUpdate('eas', input.channel);
  const messageId = template(input.messageId, variables);
  let messageBody = template(input.message, variables);
  if (input.ios) {
    const iosUpdate = update.find(u => u.platform === 'ios');
    if (iosUpdate) {
      const iosQr = createEasQr(iosUpdate.id);
      variables.iosQr = iosQr;
      messageBody += template(DEFAULT_SYSTEM_QR, { system: 'ios', qr: iosQr });
    }
  }
  if (input.android) {
    const iosUpdate = update.find(u => u.platform === 'android');
    if (iosUpdate) {
      const androidQr = createEasQr(iosUpdate.id);
      variables.androidQr = androidQr;
      messageBody += template(DEFAULT_SYSTEM_QR, { system: 'android', qr: androidQr });
    }
  }
  if (!input.comment) {
    info(`Skipped comment: 'comment' is disabled`);
  } else {
    await createIssueComment({
      ...pullContext(),
      token: input.githubToken,
      id: messageId,
      body: messageBody,
    });
  }
  for (const name in variables) {
    setOutput(name, variables[name]);
  }

  setOutput('messageId', messageId);
  setOutput('message', messageBody);
}

executeAction(updateAction);
