import { getInput, info, setFailed } from '@actions/core';

import {
  appPlatformDisplayNames,
  appPlatformEmojis,
  BuildInfo,
  easBuild,
  getBuildLogsUrl,
  parseCommand,
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

executeAction(commandAction);

export async function commandAction(input: CommandInput = commandInput()) {
  const comment = issueComment();
  if (!comment) {
    return;
  }

  const command = parseCommand(comment);
  if (!command) {
    info("Comment didn't contain a valid expo/eas command");
    return;
  }

  const context = commentContext();
  const cmdName = command.args[0];
  if (command.cli !== 'eas' || cmdName !== 'build') {
    setFailed(`We don't support \`${command.cli} ${cmdName}\` yet`);
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

  if (input.reaction) {
    await createReaction({
      ...context,
      token: input.githubToken,
      content: input.reaction,
    });
  }

  const result = await easBuild(command);
  await createIssueComment({
    ...context,
    token: input.githubToken,
    id: 'eas build',
    body: createBuildComment(result),
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
