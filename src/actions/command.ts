import { getInput } from '@actions/core';

import {
  appPlatformDisplayNames,
  appPlatformEmojis,
  BuildInfo,
  CliName,
  getBuildLogsUrl,
  parseCommand,
  projectInfo,
  projectOwner,
  runCommand,
} from '../expo';
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
    await createIssueComment({
      ...context,
      token: input.githubToken,
      id: `${context.comment_id ?? context.number}`,
      body: createHelpComment({
        input: comment,
        submitProfiles: [],
      }),
    });
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
    body: createDetails({
      summary: 'Command output',
      details: codeBlock(result[0] || result[1]),
    }),
  });
}

type HelpCommentInput = {
  input: string;
  submitProfiles: string[];
};

function createHelpComment(input: HelpCommentInput) {
  const submitArgs = ['submit'];
  if (input.submitProfiles.length) {
    submitArgs.push(`--submit-profiles <${input.submitProfiles.join('|')}>`);
  }
  return [
    `> ${input.input}`,
    '',
    `I can't recognize your command, please see below for supported commands.`,
    createDetails({
      summary: 'Supported commands',
      details: [
        '### EAS-CLI',
        `- \`eas ${submitArgs.join(' ')}\` start a build.`,
        '',
        '### EXPO-CLI',
        '- `expo publish` deploy a project to Expo hosting',
      ].join('\n'),
    }),
  ].join('\n');
}

function createDetails({ summary, details }: { summary: string; details: string }): string {
  return `<details><summary>${summary}</summary>\n\n${details}\n</details>`;
}

function codeBlock(content: string, language: string = '') {
  return `\`\`\`${language}\n${content}\n\`\`\``;
}

function createBuildComment(builds: BuildInfo[]) {
  const buildLinks = builds.map(
    build =>
      ` ${appPlatformEmojis[build.platform]} [${
        appPlatformDisplayNames[build.platform]
      } build details](${getBuildLogsUrl(build)}) `
  );

  const firstBuild = builds[0];
  return [
    `Commit #${firstBuild.gitCommitHash} is building...'`,
    '',
    `|${buildLinks.join('|')}|`,
    `|${Array(buildLinks.length).fill(':-:').join('|')}`,
    '',
    createDetails({
      summary: 'Build Details',
      details: [
        '## Summary',
        '',
        `- **Distribution**: \`${firstBuild.distribution}\``,
        `- **Build profile**: \`${firstBuild.buildProfile}\``,
        `- **SDK version**: \`${firstBuild.sdkVersion}\``,
        `- **App version**: \`${firstBuild.appVersion}\``,
        `- **Release channel**: \`${firstBuild.appVersion}\``,
      ].join('\n'),
    }),
  ].join('\n');
}
