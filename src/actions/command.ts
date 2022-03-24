import { getInput } from '@actions/core';

import { CliName, parseCommand, projectInfo, projectOwner, runCommand } from '../expo';
import { commentContext, createIssueComment, createReaction, issueComment, pullContext, Reaction } from '../github';
import { executeAction } from '../worker';

export type CommandInput = ReturnType<typeof commandInput>;

export function commandInput() {
  return {
    project: getInput('project'),
    reaction: getInput('reaction') as Reaction['content'],
    githubToken: getInput('github-token'),
  };
}

const whitelistCommands: { [key in CliName]: string[] } = {
  eas: ['submit'],
  expo: ['publish'],
};

executeAction(commandAction);

export async function commandAction(input: CommandInput = commandInput()) {
  const comment = issueComment();
  if (!comment) {
    return;
  }

  const command = parseCommand(comment);
  if (!command) {
    return;
  }

  const availableCommands = whitelistCommands[command.cli];
  if (availableCommands.length > 0 && !availableCommands.includes(command.args[0])) {
    return;
  }
  const result = await runCommand(command);

  const project = await projectInfo(input.project);
  if (!project.owner) {
    project.owner = await projectOwner();
  }

  const { comment_id, number } = commentContext();
  await createIssueComment({
    ...pullContext(),
    token: input.githubToken,
    id: `${comment_id ?? number}`,
    body: result[0] || result[1],
  });

  if (!input.reaction) {
    return;
  }
  await createReaction({
    ...commentContext(),
    token: input.githubToken,
    content: input.reaction,
  });
}
