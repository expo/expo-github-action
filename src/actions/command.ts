import { getInput } from '@actions/core';

import { projectInfo, projectOwner } from '../expo';
import { commentContext, createReaction, findAction, Reaction } from '../github';
import { executeAction } from '../worker';

export type CommandInput = ReturnType<typeof commandInput>;

export function commandInput() {
  return {
    project: getInput('project'),
    reaction: getInput('reaction') as Reaction['content'],
    githubToken: getInput('github-token'),
  };
}

executeAction(commandAction);

export async function commandAction(input: CommandInput = commandInput()) {
  const action = findAction();
  if (!action) {
    return;
  }

  const project = await projectInfo(input.project);
  if (!project.owner) {
    project.owner = await projectOwner();
  }

  if (!input.reaction) {
    return;
  }
  await createReaction({
    ...commentContext(),
    token: input.githubToken,
    content: input.reaction,
  });
}
