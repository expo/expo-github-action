import * as core from '@actions/core';

import { SetupInput, setupInput, setupAction } from '../../src/actions/setup';
import * as cacher from '../../src/cacher';
import * as expo from '../../src/expo';
import * as packager from '../../src/packager';
import * as worker from '../../src/worker';
import { mockInput } from '../utils';

jest.mock('@actions/core');
jest.mock('../../src/cacher');
jest.mock('../../src/expo');
jest.mock('../../src/packager');
jest.mock('../../src/worker');

describe(setupInput, () => {
  it('returns object with correct defaults', () => {
    expect(setupInput()).toMatchObject({
      easCache: true,
      easVersion: undefined,
      expoCache: true,
      expoVersion: undefined,
      packager: 'yarn',
      patchWatchers: true,
      token: undefined,
    });
  });

  it('returns expo version and cache', () => {
    mockInput({ 'expo-version': '5.x', 'expo-cache': 'true' });
    expect(setupInput()).toMatchObject({ expoVersion: '5.x', expoCache: true });
  });

  it('returns eas version and cache', () => {
    mockInput({ 'eas-version': 'latest', 'eas-cache': 'true' });
    expect(setupInput()).toMatchObject({ easVersion: 'latest', easCache: true });
  });

  it('returns different packager', () => {
    mockInput({ packager: 'npm' });
    expect(setupInput()).toMatchObject({ packager: 'npm' });
  });

  it('returns disabled patch watchers', () => {
    mockInput({ 'patch-watchers': 'false' });
    expect(setupInput()).toMatchObject({ patchWatchers: false });
  });

  it('returns token', () => {
    mockInput({ token: 'faketoken' });
    expect(setupInput()).toMatchObject({ token: 'faketoken' });
  });
});

describe(setupAction, () => {
  const input: SetupInput = {
    easCache: false,
    easVersion: '',
    expoCache: false,
    expoVersion: '',
    packager: 'yarn',
    patchWatchers: true,
    token: '',
  };

  beforeAll(() => {
    jest.mocked(core.group).mockImplementation((_, action) => action());
  });

  ['expo', 'eas'].forEach(cli => {
    const cliName = `${cli}-cli`;
    const cliVersion = `${cli}Version`;
    const cliCache = `${cli}Cache`;

    it(`installs ${cliName} using npm`, async () => {
      jest.mocked(packager.resolvePackage).mockResolvedValue('5.0.3');
      await setupAction({ ...input, [cliVersion]: '5.x', [cliCache]: false, packager: 'npm' });
      expect(packager.installPackage).toBeCalledWith(cliName, '5.0.3', 'npm');
      expect(worker.installToolFromPackage).toBeCalled();
    });

    it(`installs ${cliName} from cache`, async () => {
      jest.mocked(packager.resolvePackage).mockResolvedValue('5.0.3');
      jest.mocked(cacher.restoreFromCache).mockResolvedValue('fake/path');
      await setupAction({ ...input, [cliVersion]: 'latest', [cliCache]: true });
      expect(packager.installPackage).not.toBeCalled();
      expect(worker.installToolFromPackage).toBeCalledWith('fake/path');
    });
  });

  it('authenticates token with eas-cli by default', async () => {
    await setupAction({ ...input, expoVersion: 'latest', easVersion: 'latest', token: 'faketoken' });
    expect(expo.authenticate).toBeCalledWith('faketoken', 'eas');
  });

  it('authenticates token with expo-cli without eas-cli', async () => {
    await setupAction({ ...input, expoVersion: 'latest', token: 'faketoken' });
    expect(expo.authenticate).toBeCalledWith('faketoken', 'expo');
  });

  it('authenticates token without any cli', async () => {
    await setupAction({ ...input, token: 'faketoken' });
    expect(expo.authenticate).toBeCalledWith('faketoken', undefined);
  });

  it('patches watchers', async () => {
    await setupAction({ ...input, patchWatchers: true });
    expect(worker.patchWatchers).toBeCalled();
  });
});
