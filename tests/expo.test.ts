import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';

import { authenticate, projectQR, projectLink } from '../src/expo';

jest.mock('@actions/core');
jest.mock('@actions/exec');
jest.mock('@actions/io');

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
    expect(projectQR({ name: 'fakename', slug: 'fakeslug', owner: 'fakeowner' }, 'fakechannel')).toBe(
      'https://qr.expo.dev/expo-go?owner=fakeowner&slug=fakeslug&releaseChannel=fakechannel'
    );
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
    expect(projectLink({ name: 'fakename', slug: 'fakeslug', owner: 'fakeowner' }, 'fakechannel')).toBe(
      'https://expo.dev/@fakeowner/fakeslug?release-channel=fakechannel'
    );
  });
});
