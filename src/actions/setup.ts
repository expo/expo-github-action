import { getBooleanInput, getInput, group, info } from '@actions/core';

import { restoreFromCache, saveToCache } from '../cacher';
import { installPackage, resolvePackage } from '../packager';
import { executeAction, expoAuthenticate, findTool, installToolFromPackage, patchWatchers } from '../worker';

// Auto-execute in GitHub actions
executeAction(setupAction);

export function setupInput() {
  return {
    expoVersion: getInput('expo-cli'),
    expoCache: getBooleanInput('expo-cache'),
    easVersion: getInput('eas-cli'),
    easCache: getBooleanInput('eas-cache'),
    token: getInput('token'),
    patchWatchers: !getInput('patch-watchers') || getBooleanInput('patch-watchers'),
    packager: getInput('packager') || 'yarn',
  };
}

export async function setupAction(): Promise<void> {
  const input = setupInput();

  if (!input.expoVersion) {
    info(`Skipped installing expo-cli: 'expo-version' not provided.`);
  } else {
    const version = await resolvePackage('expo-cli', input.expoVersion);
    const message = input.expoCache
      ? `Installing expo-cli (${version}) from cache or with ${input.packager}`
      : `Installing expo-cli (${version}) with ${input.packager}`;

    await group(message, () => installCli('expo-cli', version, input.packager, input.expoCache));
  }

  if (!input.easVersion) {
    info(`Skipped installing eas-cli: 'eas-version' not provided.`);
  } else {
    const version = await resolvePackage('eas-cli', input.easVersion);
    const message = input.easCache
      ? `Installing eas-cli (${version}) from cache or with ${input.packager}`
      : `Installing eas-cli (${version}) with ${input.packager}`;

    await group(message, () => installCli('eas-cli', input.easVersion, input.packager, input.easCache));
  }

  if (!input.token) {
    info(`Skipped authentication: 'token' not provided.`);
  } else {
    await group('Validating authenticated account', () =>
      expoAuthenticate(input.token, input.easVersion ? 'eas-cli' : input.expoVersion ? 'expo-cli' : undefined)
    );
  }

  if (!input.patchWatchers) {
    info(`Skipped patching watchers: 'patch-watchers' disabled.`);
  } else {
    await group(`Patching system watchers for the 'ENOSPC' error`, patchWatchers);
  }
}

async function installCli(name: string, version: string, packager: string, cache: boolean = true) {
  const cliVersion = await resolvePackage(name, version);
  let cliPath = findTool(name, cliVersion) || undefined;

  if (!cliPath && cache) {
    cliPath = await restoreFromCache(name, cliVersion, packager);
  }

  if (!cliPath) {
    cliPath = await installPackage(name, cliVersion, packager);

    if (cache) {
      await saveToCache(name, cliVersion, packager);
    }
  }

  installToolFromPackage(cliPath);
}
