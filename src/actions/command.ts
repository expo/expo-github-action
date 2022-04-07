import { getInput, info, setFailed } from '@actions/core';

import {
  appPlatformDisplayNames,
  appPlatformEmojis,
  BuildInfo,
  easBuild,
  getBuildLogsUrl,
  parseCommand,
  projectInfo,
  projectOwner,
} from '../expo';
import { createIssueComment, createReaction, issueComment, Reaction } from '../github';
import { template } from '../utils';
import { executeAction } from '../worker';

export type CommandInput = ReturnType<typeof commandInput>;

export const MESSAGE_ID = `app:@{projectOwner}/{projectSlug} {cli} {cmdName}`;

export function commandInput() {
  return {
    reaction: '+1' as Reaction['content'],
    githubToken: getInput('github-token'),
  };
}

executeAction(commandAction);

export async function commandAction(input: CommandInput = commandInput()) {
  const [comment, context] = issueComment();
  if (!comment) {
    return;
  }

  const command = parseCommand(comment);
  if (!command) {
    info("Comment didn't contain a valid expo/eas command");
    return;
  }

  const cmdName = command.args[0];
  if (command.cli !== 'eas' || cmdName !== 'build') {
    setFailed(`We don't support \`${command.cli} ${cmdName}\` yet`);
    await createIssueComment({
      ...context,
      token: input.githubToken,
      id: `${context.comment_id ?? context.number}`,
      body: createHelpComment({
        input: comment,
        buildProfiles: [],
      }),
    });
    return;
  }

  if (input.reaction) {
    await createReaction({
      ...context,
      token: input.githubToken,
      content: input.reaction,
    });
  }

  const project = await projectInfo('');
  if (!project.owner) {
    project.owner = await projectOwner();
  }
  const variables: Record<string, string> = {
    projectName: project.name,
    projectOwner: project.owner || '',
    projectSlug: project.slug,
    cli: command.cli,
    cmdName,
  };

  const messageId = template(MESSAGE_ID, variables);
  const result = await easBuild(command);
  await createIssueComment({
    ...context,
    token: input.githubToken,
    id: messageId,
    body: createBuildComment(result),
  });
}

type HelpCommentInput = {
  input: string;
  buildProfiles: string[];
};

function createHelpComment(input: HelpCommentInput) {
  const buildArgs = ['build'];
  if (input.buildProfiles.length) {
    buildArgs.push(`--profile <${input.buildProfiles.join('|')}>`);
  }
  return [
    `> ${input.input}`,
    '',
    `I didn't recognize your command, please retry with one of the commands below.`,
    createDetails({
      summary: 'Available commands',
      details: [
        '### EAS-CLI',
        `- \`eas ${buildArgs.join(' ')}\` start a build.`,
        // '',
        // '### EXPO-CLI',
        // '- `expo publish` deploy a project to Expo hosting',
      ].join('\n'),
    }),
  ].join('\n');
}

function createDetails({ summary, details }: { summary: string; details: string }): string {
  return `<details><summary>${summary}</summary>\n\n${details}\n</details>`;
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
    `Commit ${firstBuild.gitCommitHash} is building...`,
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
