import * as exec from '@actions/exec';
import * as io from '@actions/io';

import {
  collectContinuousDeployFingerprintInput,
  createEASBuildAsync,
} from '../../actions/continuous-deploy-fingerprint';
import { getBuildLogsUrl } from '../../expo';

jest.mock('@actions/exec');
jest.mock('@actions/io');
jest.mock('../../worker');

describe(collectContinuousDeployFingerprintInput, () => {
  it.each([
    { value: '', expected: undefined },
    { value: 'myapp-dev', expected: 'myapp-dev' },
  ])('reads the native scheme override "$value"', ({ value, expected }) => {
    const previous = process.env;
    process.env = {
      ...previous,
      INPUT_PROFILE: 'development',
      INPUT_BRANCH: 'preview-test',
      INPUT_PLATFORM: 'all',
      'INPUT_GITHUB-TOKEN': 'test-token',
      'INPUT_WORKING-DIRECTORY': '.',
      'INPUT_APP-SCHEME': value,
    };
    try {
      expect(collectContinuousDeployFingerprintInput().appScheme).toBe(expected);
    } finally {
      process.env = previous;
    }
  });
});

describe(createEASBuildAsync, () => {
  it('normalizes the build JSON of eas-cli >= 22', async () => {
    jest.mocked(io.which).mockResolvedValue('eas');
    jest.mocked(exec.getExecOutput).mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify([
        {
          id: 'fakebuildid',
          platform: 'IOS',
          app: { slug: 'fakeslug', ownerAccount: { name: 'fakeowner' } },
          updateChannel: { name: 'fakechannel' },
          runtime: { version: 'fakeruntime' },
          status: 'NEW',
        },
      ]),
      stderr: '',
    });

    const build = await createEASBuildAsync({
      cwd: 'fake/path',
      profile: 'preview',
      platform: 'ios',
      autoSubmit: false,
    });

    expect(build.project).toStrictEqual({ slug: 'fakeslug', ownerAccount: { name: 'fakeowner' } });
    expect(build.channel).toBe('fakechannel');
    expect(build.runtimeVersion).toBe('fakeruntime');
    expect(getBuildLogsUrl(build)).toBe(
      'https://expo.dev/accounts/fakeowner/projects/fakeslug/builds/fakebuildid'
    );
  });
});
