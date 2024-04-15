import { getBooleanInput, getInput, setOutput, group, setFailed, info } from '@actions/core';

import { getTemplateVariablesForUpdates } from '../comment';
import { EasUpdate, assertEasVersion, createUpdate } from '../eas';
import { createIssueComment, hasPullContext, pullContext } from '../github';
import { loadProjectConfig } from '../project';
import { template } from '../utils';
import { executeAction } from '../worker';

export const MESSAGE_ID = 'projectId:{projectId}';

export function previewInput() {
  const qrTarget = getInput('qr-target') || undefined;
  if (qrTarget && !['expo-go', 'dev-client'].includes(qrTarget)) {
    throw new Error(`Invalid QR code target: "${qrTarget}", expected "expo-go" or "dev-build"`);
  }

  return {
    command: getInput('command'),
    shouldComment: !getInput('comment') || getBooleanInput('comment'),
    commentId: getInput('comment-id') || MESSAGE_ID,
    workingDirectory: getInput('working-directory'),
    githubToken: getInput('github-token'),
    // Note, `dev-build` is prefered, but `dev-client` is supported to aovid confusion
    qrTarget: qrTarget as undefined | 'expo-go' | 'dev-build' | 'dev-client',
  };
}

executeAction(previewAction);

export async function previewAction(input = previewInput()) {
  // See: https://github.com/expo/eas-cli/releases/tag/v3.3.2
  // See: https://github.com/expo/eas-cli/releases/tag/v3.4.0
  // We need the revised `eas update --json` output to parse the update information.
  await assertEasVersion('>=3.4.0');

  // Create the update before loading project information.
  // When the project needs to be set up, EAS project ID won't be available before this command.
  const command = sanitizeCommand(input.command);
  const updates = await group(`Run eas ${command}"`, () => createUpdate(input.workingDirectory, command));

  const update = updates.find(update => !!update);
  if (!update) {
    return setFailed(`No update found in command output.`);
  }

  const config = await loadProjectConfig(input.workingDirectory);
  if (!config.extra?.eas?.projectId) {
    return setFailed(`Missing 'extra.eas.projectId' in app.json or app.config.js.`);
  }

  const variables = getTemplateVariablesForUpdates(config, updates, input);
  const messageId = template(input.commentId, variables);
  const messageBody = createSummaryForUpdates(updates, variables);

  if (!input.shouldComment) {
    info(`Skipped comment: 'comment' is disabled`);
  } else if (!hasPullContext()) {
    info(`Skipped comment: action was not ran from a pull request`);
  } else {
    await createIssueComment({
      ...pullContext(),
      token: input.githubToken,
      id: messageId,
      body: messageBody,
    });
  }

  for (const [name, value] of Object.entries(variables)) {
    setOutput(name, value);
  }

  setOutput('commentId', messageId);
  setOutput('comment', messageBody);
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

/**
 * Generate the message body for a single update.
 * Note, this is not configurable, but you can use the variables used to construct your own.
 */
export function createSummaryForUpdates(updates: EasUpdate[], vars: ReturnType<typeof getTemplateVariablesForUpdates>) {
  // If all updates are in the same group, we can unify QR codes
  if (updates.every(update => update.group === updates[0].group)) {
    return createSingleQrSummaryForUpdates(updates, vars);
  }

  return createMultipleQrSummaryForUpdates(updates, vars);
}

function createSummaryHeaderForUpdates(updates: EasUpdate[], vars: ReturnType<typeof getTemplateVariablesForUpdates>) {
  const platformName = `Platform${updates.length === 1 ? '' : 's'}`;
  const platformValue = updates
    .map(update => update.platform)
    .sort((a, b) => a.localeCompare(b))
    .map(platform => `**${platform}**`)
    .join(', ');

  const appSchemes = vars.projectScheme ? `- Scheme → **${JSON.parse(vars.projectSchemes).join('**, **')}**` : '';

  return `🚀 Expo preview is ready!

- Project → **${vars.projectSlug}**
- ${platformName} → ${platformValue}
${appSchemes}`.trim();
}

function createSingleQrSummaryForUpdates(
  updates: EasUpdate[],
  vars: ReturnType<typeof getTemplateVariablesForUpdates>
) {
  return `${createSummaryHeaderForUpdates(updates, vars)}
- Runtime Version → **${vars.runtimeVersion}**
- **[More info](${vars.link})**

<a href="${vars.qr}"><img src="${vars.qr}" width="250px" height="250px" /></a>

> Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)`;
}

function createMultipleQrSummaryForUpdates(
  updates: EasUpdate[],
  vars: ReturnType<typeof getTemplateVariablesForUpdates>
) {
  const createTableHeader = (segments: string[]) => segments.filter(Boolean).join(' <br /> ');

  const androidHeader = createTableHeader([
    'Android',
    vars.androidId && vars.androidRuntimeVersion ? `_(${vars.androidRuntimeVersion})_` : '',
    vars.androidId && vars.androidLink ? `**[More info](${vars.androidLink})**` : '',
  ]);

  const androidQr =
    vars.androidId && vars.androidQR
      ? `<a href="${vars.androidQR}"><img src="${vars.androidQR}" width="250px" height="250px" /></a>`
      : null;

  const iosHeader = createTableHeader([
    'iOS',
    vars.iosId && vars.iosRuntimeVersion ? `_(${vars.iosRuntimeVersion})_` : '',
    vars.iosId && vars.iosLink ? `**[More info](${vars.iosLink})**` : '',
  ]);

  const iosQr =
    vars.iosId && vars.iosQR
      ? `<a href="${vars.iosQR}"><img src="${vars.iosQR}" width="250px" height="250px" /></a>`
      : null;

  return `${createSummaryHeaderForUpdates(updates, vars)}

${androidHeader} | ${iosHeader}
--- | ---
${androidQr || '_not created_'} | ${iosQr || '_not created_'}

> Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)`;
}
