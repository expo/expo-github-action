import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';

import {
  authenticate,
  createEasBuildFromRawCommandAsync,
  parseCommand,
  projectDeepLink,
  projectLink,
  projectQR,
} from '../expo';

jest.mock('@actions/core');
jest.mock('@actions/exec');
jest.mock('@actions/io');

describe(parseCommand, () => {
  it('invalid command', async () => {
    expect(parseCommand('eas submit')).toBe(null);
  });
  it('#eas submit', async () => {
    expect(parseCommand('#eas submit')).toStrictEqual({
      raw: 'eas submit',
      cli: 'eas',
      args: ['submit'],
    });
    expect(parseCommand('#eas    submit   -p ios ')).toStrictEqual({
      raw: 'eas    submit   -p ios',
      cli: 'eas',
      args: ['submit', '-p', 'ios'],
    });
  });
});

describe(authenticate, () => {
  it('exports EXPO_TOKEN variable', async () => {
    await authenticate('faketoken', undefined);
    expect(core.exportVariable).toBeCalledWith('EXPO_TOKEN', 'faketoken');
  });

  it('validates EXPO_TOKEN with expo-cli', async () => {
    jest.mocked(io.which).mockResolvedValue('expo');
    await authenticate('faketoken', 'expo');
    expect(io.which).toBeCalledWith('expo');
    expect(exec.exec).toBeCalledWith('expo', ['whoami'], {
      env: expect.objectContaining({ EXPO_TOKEN: 'faketoken' }),
    });
  });

  it('validates EXPO_TOKEN with eas-cli', async () => {
    jest.mocked(io.which).mockResolvedValue('eas');
    await authenticate('faketoken', 'eas');
    expect(io.which).toBeCalledWith('eas');
    expect(exec.exec).toBeCalledWith('eas', ['whoami'], {
      env: expect.objectContaining({ EXPO_TOKEN: 'faketoken' }),
    });
  });
});

describe(createEasBuildFromRawCommandAsync, () => {
  const buildJson = '[{"id":"build-id","platform":"IOS"}]';

  beforeEach(() => {
    jest.mocked(io.which).mockResolvedValue('eas');
    jest.mocked(exec.getExecOutput).mockResolvedValue({
      stdout: buildJson,
      stderr: '',
      exitCode: 0,
    });
  });

  it('adds --no-wait by default', async () => {
    await createEasBuildFromRawCommandAsync('/tmp/project', 'build --platform ios');

    expect(exec.getExecOutput).toHaveBeenCalledWith(
      'eas build --platform ios --json --non-interactive --no-wait',
      [],
      { cwd: '/tmp/project' }
    );
  });

  it('omits --no-wait when waitForBuild is enabled', async () => {
    await createEasBuildFromRawCommandAsync('/tmp/project', 'build --platform ios', [], {
      waitForBuild: true,
    });

    expect(exec.getExecOutput).toHaveBeenCalledWith(
      'eas build --platform ios --json --non-interactive',
      [],
      { cwd: '/tmp/project' }
    );
  });

  it('rejects conflicting --no-wait when waitForBuild is enabled', async () => {
    await expect(
      createEasBuildFromRawCommandAsync('/tmp/project', 'build --platform ios --no-wait', [], {
        waitForBuild: true,
      })
    ).rejects.toThrow(
      'Cannot use wait-for-build when the EAS build command already includes --no-wait.'
    );

    expect(exec.getExecOutput).not.toHaveBeenCalled();
  });
});

describe(projectQR, () => {
  it('throws when owner is undefined', () => {
    expect(() => projectQR({ name: 'fakename', slug: 'fakeslug' })).toThrow('without owner');
  });

  it('returns url with owner and slug', () => {
    expect(projectQR({ name: 'fakename', slug: 'fakeslug', owner: 'fakeowner' })).toBe(
      'https://qr.expo.dev/expo-go?owner=fakeowner&slug=fakeslug'
    );
  });

  it('returns url with owner, slug, and release channel', () => {
    expect(
      projectQR({ name: 'fakename', slug: 'fakeslug', owner: 'fakeowner' }, 'fakechannel')
    ).toBe('https://qr.expo.dev/expo-go?owner=fakeowner&slug=fakeslug&releaseChannel=fakechannel');
  });
});

describe(projectLink, () => {
  it('throws when owner is undefined', () => {
    expect(() => projectLink({ name: 'fakename', slug: 'fakeslug' })).toThrow('without owner');
  });

  it('returns url with owner and slug', () => {
    expect(projectLink({ name: 'fakename', slug: 'fakeslug', owner: 'fakeowner' })).toBe(
      'https://expo.dev/@fakeowner/fakeslug'
    );
  });

  it('returns url with owner, slug, and release channel', () => {
    expect(
      projectLink({ name: 'fakename', slug: 'fakeslug', owner: 'fakeowner' }, 'fakechannel')
    ).toBe('https://expo.dev/@fakeowner/fakeslug?release-channel=fakechannel');
  });
});

describe(projectDeepLink, () => {
  it('throws when owner is undefined', () => {
    expect(() => projectDeepLink({ name: 'fakename', slug: 'fakeslug' })).toThrow('without owner');
  });

  it('returns url with owner and slug', () => {
    expect(projectDeepLink({ name: 'fakename', slug: 'fakeslug', owner: 'fakeowner' })).toBe(
      'exp://exp.host/@fakeowner/fakeslug'
    );
  });

  it('returns url with owner, slug, and release channel', () => {
    expect(
      projectDeepLink({ name: 'fakename', slug: 'fakeslug', owner: 'fakeowner' }, 'fakechannel')
    ).toBe('exp://exp.host/@fakeowner/fakeslug?release-channel=fakechannel');
  });
});
