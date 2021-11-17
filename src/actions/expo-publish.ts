import { getInput, setFailed } from '@actions/core';
import { exec } from '@actions/exec';
import * as path from 'path';

import * as tools from '../tools';

// Auto-execute in GitHub actions
tools.performAction(expoPublishAction).catch(setFailed);

export async function expoPublishAction(): Promise<void> {
  await tools.assertInstalled('expo-cli');

  const { releaseChannel, workingDirectory } = getInputs();
  const options = ['publish'];

  if (releaseChannel) {
    options.push(`--release-channel=${releaseChannel}`);
  }

  try {
    await exec(tools.getBinaryName('expo-cli'), options, { cwd: workingDirectory });
  } catch (error) {
    tools.handleError('expo-cli', error);
  }
}

type Inputs = {
  releaseChannel?: string;
  workingDirectory?: string;
};

function getInputs(): Inputs {
  const githubWorkspace = process.env['GITHUB_WORKSPACE'];
  if (!githubWorkspace) {
    throw new Error(`Environment variable 'GITHUB_WORKSPACE' is not set`);
  }

  const workingDirectory = getInput('working-directory') || '.';

  return {
    workingDirectory: path.resolve(githubWorkspace, workingDirectory),
    releaseChannel: getInput('release-channel') || undefined,
  };
}
