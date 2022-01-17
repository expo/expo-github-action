import { getBooleanInput, getInput, group, info } from '@actions/core';

import { restoreFromCache, saveToCache } from '../cacher';
import { authenticate } from '../expo';
import { installPackage, resolvePackage } from '../packager';
import { executeAction, findTool, installToolFromPackage, patchWatchers } from '../worker';

export type SetupInput = ReturnType<typeof setupInput>;

export function setupInput() {
  return {
    easCache: !getInput('eas-cache') || getBooleanInput('eas-cache'),
    easVersion: getInput('eas-version'),
    expoCache: !getInput('expo-cache') || getBooleanInput('expo-cache'),
    expoVersion: getInput('expo-version'),
    packager: getInput('packager') || 'yarn',
    patchWatchers: !getInput('patch-watchers') || getBooleanInput('patch-watchers'),
    token: getInput('token'),
  };
}

executeAction(setupAction);

export async function setupAction(input: SetupInput = setupInput()) {
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

    await group(message, () => installCli('eas-cli', version, input.packager, input.easCache));
  }

  if (!input.token) {
    info(`Skipped authentication: 'token' not provided.`);
  } else {
    await group('Validating authenticated account', () =>
      authenticate(input.token, input.easVersion ? 'eas' : input.expoVersion ? 'expo' : undefined)
    );
  }

  if (!input.patchWatchers) {
    info(`Skipped patching watchers: 'patch-watchers' disabled.`);
  } else {
    await group(`Patching system watchers for the 'ENOSPC' error`, patchWatchers);
  }
}

async function installCli(name: string, version: string, packager: string, useCache = true) {
  let cliPath = findTool(name, version) || undefined;

  if (!cliPath && useCache) {
    cliPath = await restoreFromCache(name, version, packager);
  }

  if (!cliPath) {
    cliPath = await installPackage(name, version, packager);

    if (useCache) {
      await saveToCache(name, version, packager);
    }
  }

  installToolFromPackage(cliPath);
}
