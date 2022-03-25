import { getInput } from '@actions/core';

import { CliName, parseCommand, projectInfo, projectOwner, runCommand } from '../expo';
import { commentContext, createIssueComment, createReaction, issueComment, Reaction } from '../github';
import { executeAction } from '../worker';

export type CommandInput = ReturnType<typeof commandInput>;

export function commandInput() {
  return {
    project: getInput('project'),
    reaction: (getInput('reaction') ?? '+1') as Reaction['content'],
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

  const context = commentContext();
  if (input.reaction) {
    await createReaction({
      ...context,
      token: input.githubToken,
      content: input.reaction,
    });
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

  await createIssueComment({
    ...context,
    token: input.githubToken,
    id: `${context.comment_id ?? context.number}`,
    body: createDetails('Command output', codeBlock(result[0] || result[1])),
  });
}

function createDetails(summary: string, details: string): string {
  return `<details><summary>${summary}</summary>\n\n${details}\n</details>`;
}

function codeBlock(content: string, language: string = '') {
  return `\`\`\`${language}\n${content}\n\`\`\``;
}

// <!-- 1078458632 -->
// > #expo blah blah blah

// I can't recognize your command, please see below for supported commands.

// <details><summary>Supported commands</summary>

// ### EAS-CLI
// - `eas submit --profile <development|preview|production>` start a build.

// ### EXPO-CLI
// - `expo publish` deploy a project to Expo hosting

// </details>