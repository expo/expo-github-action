import { getToolsMock, mockInput } from '../utils';

jest.mock('../../src/tools', () => getToolsMock());

import * as core from '@actions/core';

import * as install from '../../src/install';
import * as tools from '../../src/tools';
import { setupAction } from '../../src/actions/setup';

describe(setupAction, () => {
  describe('patch watchers', () => {
    it('patches the system when set to true', async () => {
      mockInput({ 'patch-watchers': 'true' }, true);
      await setupAction();
      expect(tools.maybePatchWatchers).toHaveBeenCalled();
    });

    it('patches the system when not set', async () => {
      mockInput({ 'patch-watchers': '' }, true);
      await setupAction();
      expect(tools.maybePatchWatchers).toHaveBeenCalled();
    });

    it('skips the system patch when set to false', async () => {
      mockInput({ 'patch-watchers': 'false' }, true);
      await setupAction();
      expect(tools.maybePatchWatchers).not.toHaveBeenCalled();
    });
  });

  describe('authentication', () => {
    it('authenticates with provided credentials', async () => {
      mockInput({ username: 'bycedric', password: 'mypassword' });
      await setupAction();
      expect(tools.maybeAuthenticate).toBeCalledWith({ username: 'bycedric', password: 'mypassword' });
    });

    it('authenticates with provided token', async () => {
      mockInput({ token: 'ABC123' });
      await setupAction();
      expect(tools.maybeAuthenticate).toBeCalledWith({ token: 'ABC123' });
    });
  });

  ['expo', 'eas'].forEach(cliName => {
    const packageName = `${cliName}-cli`;
    let installMock: jest.SpyInstance;

    beforeEach(() => {
      installMock = jest.spyOn(install, 'install').mockImplementation();
    });

    afterEach(() => {
      installMock.mockRestore();
    });

    describe(packageName, () => {
      it(`skips installation without \`${cliName}-version\``, async () => {
        mockInput();
        await setupAction();
        expect(installMock).not.toBeCalledWith({ package: packageName });
      });

      it('installs with yarn by default', async () => {
        mockInput({ [`${cliName}-version`]: 'latest' });
        await setupAction();
        expect(installMock).toBeCalledWith({
          package: packageName,
          version: 'latest',
          packager: 'yarn',
          cache: false,
        });
      });

      it('installs provided version with npm', async () => {
        mockInput({ [`${cliName}-version`]: '3.0.10', packager: 'npm' });
        await setupAction();
        expect(installMock).toBeCalledWith({
          package: packageName,
          version: '3.0.10',
          packager: 'npm',
          cache: false,
        });
      });

      it('installs with yarn and cache enabled', async () => {
        mockInput({
          packager: 'yarn',
          [`${cliName}-version`]: '4.2.0',
          [`${cliName}-cache`]: 'true',
        });
        await setupAction();
        expect(installMock).toBeCalledWith({
          package: packageName,
          version: '4.2.0',
          packager: 'yarn',
          cache: true,
        });
      });

      it('installs with yarn and custom cache key', async () => {
        mockInput({
          packager: 'yarn',
          [`${cliName}-version`]: '4.2.0',
          [`${cliName}-cache`]: 'true',
          [`${cliName}-cache-key`]: 'custom-key',
        });
        await setupAction();
        expect(installMock).toBeCalledWith({
          package: packageName,
          version: '4.2.0',
          packager: 'yarn',
          cache: true,
          cacheKey: 'custom-key',
        });
      });

      it('installs path to global path', async () => {
        installMock.mockResolvedValue(`/${cliName}/install/path`);
        const addPathSpy = jest.spyOn(core, 'addPath').mockImplementation();
        await setupAction();
        expect(addPathSpy).toBeCalledWith(`/${cliName}/install/path`);
      });
    });
  });
});
