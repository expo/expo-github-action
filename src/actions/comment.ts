import { getInput } from '@actions/core';

import { ProjectInfo, projectInfo, projectLink, projectOwner, projectQR } from '../expo';
import { createIssueComment, pullContext } from '../github';
import { executeAction } from '../worker';

export type CommentInput = ReturnType<typeof commentInput>;

const DEFAULT_ID = `app:{projectSlug} channel:{releaseChannel}`;
const DEFAULT_MESSAGE =
  `This pull request was automatically deployed using [GitHub Actions](https://github.com/expo/expo-github-action)!\n` +
  `\n- Project owner: **{projectOwner}**` +
  `\n- Project name: **{projectName}**` +
  `\n- Release channel: **{releaseChannel}**` +
  `\n\n<a href="{projectQR}"><img src="{projectQR}" height="200px" width="200px"></a>`;

export function commentInput() {
  return {
    project: getInput('project'),
    channel: getInput('channel') || 'default',
    message: getInput('message') || DEFAULT_MESSAGE,
    messageId: getInput('message-id') || DEFAULT_ID,
  };
}

// Auto-execute in GitHub actions
executeAction(commentAction);

export async function commentAction(input: CommentInput = commentInput()) {
  const pull = pullContext();
  const project = await projectInfo(input.project);

  if (!project.owner) {
    project.owner = await projectOwner();
  }

  await createIssueComment(pull, {
    id: makeTemplate(input.messageId, project, input),
    body: makeTemplate(input.message, project, input),
  });
}

function makeTemplate(template: string, project: ProjectInfo, input: CommentInput) {
  let result = template;
  const replacements: Record<string, string> = {
    projectLink: projectLink(project, input.channel),
    projectName: project.name,
    projectOwner: project.owner || '',
    projectQR: projectQR(project, input.channel),
    projectSlug: project.slug,
    releaseChannel: input.channel,
  };

  for (const name in replacements) {
    result = result.replaceAll(`{${name}}`, replacements[name]);
  }

  return result;
}
