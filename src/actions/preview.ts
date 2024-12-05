import { getBooleanInput, getInput, group, info, setFailed, setOutput } from '@actions/core';
import { ExpoConfig } from '@expo/config';

import { getQrTarget, getSchemesInOrderFromConfig } from '../comment';
import {
  EasUpdate,
  assertEasVersion,
  createUpdate,
  getUpdateGroupQr,
  getUpdateGroupWebsite,
} from '../eas';
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
  const updates = await group(`Run eas ${command}"`, () =>
    createUpdate(input.workingDirectory, command)
  );

  const update = updates.find(update => !!update);
  if (!update) {
    return setFailed(`No update found in command output.`);
  }

  const config = await loadProjectConfig(input.workingDirectory, null);
  if (!config.extra?.eas?.projectId) {
    return setFailed(`Missing 'extra.eas.projectId' in app.json or app.config.js.`);
  }

  const variables = getVariables(config, updates, input);
  const messageId = template(input.commentId, variables);
  const messageBody = createSummary(updates, variables);

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
 * Generate useful variables for the message body, and as step outputs.
 */
export function getVariables(
  config: ExpoConfig,
  updates: EasUpdate[],
  options: ReturnType<typeof previewInput>
) {
  const projectId: string = config.extra?.eas?.projectId;
  const android = updates.find(update => update.platform === 'android');
  const ios = updates.find(update => update.platform === 'ios');

  const appSchemes = getSchemesInOrderFromConfig(config) || [];
  const appSlug = config.slug;
  const qrTarget = getQrTarget(options);

  return {
    // EAS / Expo specific
    projectId,
    projectName: config.name,
    projectSlug: appSlug,
    projectScheme: appSchemes[0] || '', // This is the longest scheme from one or more custom app schemes
    projectSchemes: JSON.stringify(appSchemes), // These are all custom app schemes, in order from longest to shortest as JSON
    // Shared update properties
    // Note, only use these properties when the update groups are identical
    groupId: updates[0].group,
    runtimeVersion: updates[0].runtimeVersion,
    qr: getUpdateGroupQr({ projectId, updateGroupId: updates[0].group, appSlug, qrTarget }),
    link: getUpdateGroupWebsite({ projectId, updateGroupId: updates[0].group }),
    // These are safe to access regardless of the update groups
    branchName: updates[0].branch,
    message: updates[0].message,
    createdAt: updates[0].createdAt,
    gitCommitHash: updates[0].gitCommitHash,
    // Android update
    androidId: android?.id || '',
    androidGroupId: android?.group || '',
    androidBranchName: android?.branch || '',
    androidManifestPermalink: android?.manifestPermalink || '',
    androidMessage: android?.message || '',
    androidRuntimeVersion: android?.runtimeVersion || '',
    androidQR: android
      ? getUpdateGroupQr({ projectId, updateGroupId: android.group, appSlug, qrTarget })
      : '',
    androidLink: android ? getUpdateGroupWebsite({ projectId, updateGroupId: android.group }) : '',
    // iOS update
    iosId: ios?.id || '',
    iosGroupId: ios?.group || '',
    iosBranchName: ios?.branch || '',
    iosManifestPermalink: ios?.manifestPermalink || '',
    iosMessage: ios?.message || '',
    iosRuntimeVersion: ios?.runtimeVersion || '',
    iosQR: ios ? getUpdateGroupQr({ projectId, updateGroupId: ios.group, appSlug, qrTarget }) : '',
    iosLink: ios ? getUpdateGroupWebsite({ projectId, updateGroupId: ios.group }) : '',
  };
}

/**
 * Generate the message body for a single update.
 * Note, this is not configurable, but you can use the variables used to construct your own.
 */
export function createSummary(updates: EasUpdate[], vars: ReturnType<typeof getVariables>) {
  // If all updates are in the same group, we can unify QR codes
  if (updates.every(update => update.group === updates[0].group)) {
    return createSingleQrSummary(updates, vars);
  }

  return createMultipleQrSummary(updates, vars);
}

function createSummaryHeader(updates: EasUpdate[], vars: ReturnType<typeof getVariables>) {
  const platformName = `Platform${updates.length === 1 ? '' : 's'}`;
  const platformValue = updates
    .map(update => update.platform)
    .sort((a, b) => a.localeCompare(b))
    .map(platform => `**${platform}**`)
    .join(', ');

  const appSchemes = vars.projectScheme
    ? `- Scheme → **${JSON.parse(vars.projectSchemes).join('**, **')}**`
    : '';

  return `🚀 Expo preview is ready!

- Project → **${vars.projectSlug}**
- ${platformName} → ${platformValue}
${appSchemes}`.trim();
}

function createSingleQrSummary(updates: EasUpdate[], vars: ReturnType<typeof getVariables>) {
  return `${createSummaryHeader(updates, vars)}
- Runtime Version → **${vars.runtimeVersion}**
- **[More info](${vars.link})**

<a href="${vars.qr}"><img src="${vars.qr}" width="250px" height="250px" /></a>

> Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)`;
}

function createMultipleQrSummary(updates: EasUpdate[], vars: ReturnType<typeof getVariables>) {
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

  return `${createSummaryHeader(updates, vars)}

${androidHeader} | ${iosHeader}
--- | ---
${androidQr || '_not created_'} | ${iosQr || '_not created_'}

> Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)`;
}
