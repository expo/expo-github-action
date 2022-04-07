import { getBooleanInput, getInput, setOutput, info } from '@actions/core';

import { projectDeepLink, projectInfo, projectLink, projectOwner, projectQR } from '../expo';
import { createIssueComment, pullContext } from '../github';
import { template } from '../utils';
import { executeAction } from '../worker';

export type CommentInput = ReturnType<typeof commentInput>;

export const DEFAULT_ID = `app:@{projectOwner}/{projectSlug} channel:{channel}`;
export const DEFAULT_MESSAGE =
  `This pull request was automatically deployed using [Expo GitHub Actions](https://github.com/expo/expo-github-action/tree/main/preview-comment)!\n` +
  `\n- Project: **@{projectOwner}/{projectSlug}**` +
  `\n- Channel: **{channel}**` +
  `\n\n<a href="{projectQR}"><img src="{projectQR}" height="200px" width="200px"></a>`;

export function commentInput() {
  return {
    channel: getInput('channel') || 'default',
    comment: !getInput('comment') || getBooleanInput('comment'),
    message: getInput('message') || DEFAULT_MESSAGE,
    messageId: getInput('message-id') || DEFAULT_ID,
    project: getInput('project'),
    githubToken: getInput('github-token'),
  };
}

executeAction(commentAction);

export async function commentAction(input: CommentInput = commentInput()) {
  const project = await projectInfo(input.project);
  if (!project.owner) {
    project.owner = await projectOwner();
  }

  const variables: Record<string, string> = {
    projectLink: projectLink(project, input.channel),
    projectDeepLink: projectDeepLink(project, input.channel),
    projectName: project.name,
    projectOwner: project.owner || '',
    projectQR: projectQR(project, input.channel),
    projectSlug: project.slug,
    channel: input.channel,
  };

  const messageId = template(input.messageId, variables);
  const messageBody = template(input.message, variables);

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
