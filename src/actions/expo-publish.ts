import { getInput, setFailed } from '@actions/core';
import { exec } from '@actions/exec';

import * as tools from '../tools';

// Auto-execute in GitHub actions
tools.performAction(expoPublishAction).catch(setFailed);

export async function expoPublishAction(): Promise<void> {
  await tools.assertInstalled('expo-cli');

  const { releaseChannel, workingDirectory } = getInputs();
  const options = releaseChannel ? [`--release-channel=${releaseChannel}`] : [];

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
  const workingDirectory = getInput('working-directory') || process.env['GITHUB_WORKSPACE'];
  if (!workingDirectory) {
    throw new Error(`Environment variable 'GITHUB_WORKSPACE' and input 'working-directory' are both undefined.`);
  }

  return {
    workingDirectory,
    releaseChannel: getInput('release-channel') || undefined,
  };
}
