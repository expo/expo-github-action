import * as core from '@actions/core';
import * as cli from '@actions/exec';

import * as tools from '../src/tools';
import * as packager from '../src/packager';
import * as utils from './utils';

describe(tools.getBinaryName, () => {
  it('returns expo for `expo-cli`', () => {
    expect(tools.getBinaryName('expo-cli')).toBe('expo');
  });

  it('returns eas for `eas-cli`', () => {
    expect(tools.getBinaryName('eas-cli')).toBe('eas');
  });

  it('returns eas.cmd for `eas-cli` for windows', () => {
    expect(tools.getBinaryName('eas-cli', true)).toBe('eas.cmd');
  });
});

describe(tools.maybeAuthenticate, () => {
  const token = 'ABC123';
  const username = 'bycedric';
  const password = 'mypassword';

  describe('with token', () => {
    let spy: { [key: string]: jest.SpyInstance } = {};

    beforeEach(() => {
      spy = {
        exportVariable: jest.spyOn(core, 'exportVariable').mockImplementation(),
        exec: jest.spyOn(cli, 'exec').mockImplementation(),
        info: jest.spyOn(core, 'info').mockImplementation(),
      };
    });

    afterAll(() => {
      spy.exportVariable.mockRestore();
      spy.exec.mockRestore();
      spy.info.mockRestore();
    });

    it('skips authentication without token', async () => {
      await tools.maybeAuthenticate();
      expect(spy.exec).not.toBeCalled();
      expect(spy.info).toBeCalledWith(expect.stringContaining('Skipping authentication'));
    });

    it('executes whoami command with token through environment', async () => {
      utils.setEnv('TEST_INCLUDED', 'hellyeah');
      await tools.maybeAuthenticate({ token, cli: 'expo-cli' });
      expect(spy.exec).toBeCalled();
      expect(spy.exec.mock.calls[0][1]).toStrictEqual(['whoami']);
      expect(spy.exec.mock.calls[0][2]).toMatchObject({
        env: {
          TEST_INCLUDED: 'hellyeah',
          EXPO_TOKEN: token,
        },
      });
      utils.restoreEnv();
    });

    it('fails when token is incorrect', async () => {
      const error = new Error('Not logged in');
      spy.exec.mockRejectedValue(error);
      await expect(tools.maybeAuthenticate({ token, cli: 'expo-cli' })).rejects.toBe(error);
    });

    it('skips validation without cli', async () => {
      await tools.maybeAuthenticate({ token });
      expect(spy.exec).not.toBeCalled();
      expect(spy.info).toBeCalledWith(expect.stringContaining('Skipping token validation'));
    });

    it('executes whoami command with `expo` on macos', async () => {
      utils.setPlatform('darwin');
      await tools.maybeAuthenticate({ token, cli: 'expo-cli' });
      expect(spy.exec).toBeCalled();
      expect(spy.exec.mock.calls[0][0]).toBe('expo');
      utils.restorePlatform();
    });

    it('executes whoami command with `eas` on ubuntu', async () => {
      utils.setPlatform('linux');
      await tools.maybeAuthenticate({ token, cli: 'eas-cli' });
      expect(spy.exec).toBeCalled();
      expect(spy.exec.mock.calls[0][0]).toBe('eas');
      utils.restorePlatform();
    });

    it('executes whoami command with `expo.cmd` on windows', async () => {
      utils.setPlatform('win32');
      await tools.maybeAuthenticate({ token, cli: 'expo-cli' });
      expect(spy.exec).toBeCalled();
      expect(spy.exec.mock.calls[0][0]).toBe('expo.cmd');
      utils.restorePlatform();
    });
  });

  describe('credentials', () => {
    let spy: { [key: string]: jest.SpyInstance } = {};

    beforeEach(() => {
      spy = {
        exec: jest.spyOn(cli, 'exec').mockImplementation(),
        info: jest.spyOn(core, 'info').mockImplementation(),
        warning: jest.spyOn(core, 'warning').mockImplementation(),
      };
    });

    afterAll(() => {
      spy.exec.mockRestore();
      spy.info.mockRestore();
      spy.warning.mockRestore();
    });

    it('skips authentication without cli', async () => {
      await tools.maybeAuthenticate({});
      expect(spy.exec).not.toBeCalled();
      expect(spy.info).toBeCalledWith(expect.stringContaining('Skipping authentication'));
    });

    it('skips authentication without credentials', async () => {
      await tools.maybeAuthenticate({ cli: 'expo-cli' });
      expect(spy.exec).not.toBeCalled();
      expect(spy.info).toBeCalledWith(expect.stringContaining('Skipping authentication'));
    });

    it('skips authentication without password', async () => {
      await tools.maybeAuthenticate({ username, cli: 'expo-cli' });
      expect(spy.exec).not.toBeCalled();
      expect(spy.info).toBeCalledWith(expect.stringContaining('Skipping authentication'));
    });

    it('skips authentication with credentials for eas-cli', async () => {
      await tools.maybeAuthenticate({ username, password, cli: 'eas-cli' });
      expect(spy.exec).not.toBeCalled();
      expect(spy.warning).toBeCalledWith(expect.stringContaining('Skipping authentication'));
    });

    it('executes login command with password through environment', async () => {
      utils.setEnv('TEST_INCLUDED', 'hellyeah');
      await tools.maybeAuthenticate({ username, password, cli: 'expo-cli' });
      expect(spy.exec).toBeCalled();
      expect(spy.exec.mock.calls[0][1]).toStrictEqual(['login', `--username=${username}`]);
      expect(spy.exec.mock.calls[0][2]).toMatchObject({
        env: {
          TEST_INCLUDED: 'hellyeah',
          EXPO_CLI_PASSWORD: password,
        },
      });
      utils.restoreEnv();
    });

    it('fails when credentials are incorrect', async () => {
      const error = new Error('Invalid username/password. Please try again.');
      spy.exec.mockRejectedValue(error);
      await expect(tools.maybeAuthenticate({ username, password, cli: 'expo-cli' })).rejects.toBe(error);
    });

    it('executes login command with `expo` on macos', async () => {
      utils.setPlatform('darwin');
      await tools.maybeAuthenticate({ username, password, cli: 'expo-cli' });
      expect(spy.exec).toBeCalled();
      expect(spy.exec.mock.calls[0][0]).toBe('expo');
      utils.restorePlatform();
    });

    it('executes login command with `expo` on ubuntu', async () => {
      utils.setPlatform('linux');
      await tools.maybeAuthenticate({ username, password, cli: 'expo-cli' });
      expect(spy.exec).toBeCalled();
      expect(spy.exec.mock.calls[0][0]).toBe('expo');
      utils.restorePlatform();
    });

    it('executes login command with `expo.cmd` on windows', async () => {
      utils.setPlatform('win32');
      await tools.maybeAuthenticate({ username, password, cli: 'expo-cli' });
      expect(spy.exec).toBeCalled();
      expect(spy.exec.mock.calls[0][0]).toBe('expo.cmd');
      utils.restorePlatform();
    });
  });
});

describe(tools.maybePatchWatchers, () => {
  let spy: { [key: string]: jest.SpyInstance } = {};

  beforeEach(() => {
    spy = {
      info: jest.spyOn(core, 'info').mockImplementation(),
      warning: jest.spyOn(core, 'warning').mockImplementation(),
      exec: jest.spyOn(cli, 'exec').mockImplementation(),
    };
  });

  afterEach(() => {
    utils.restorePlatform();
  });

  afterAll(() => {
    spy.info.mockRestore();
    spy.warning.mockRestore();
    spy.exec.mockRestore();
  });

  it('increses fs inotify settings with sysctl', async () => {
    utils.setPlatform('linux');
    await tools.maybePatchWatchers();
    expect(spy.exec).toBeCalledWith('sudo sysctl fs.inotify.max_user_instances=524288');
    expect(spy.exec).toBeCalledWith('sudo sysctl fs.inotify.max_user_watches=524288');
    expect(spy.exec).toBeCalledWith('sudo sysctl fs.inotify.max_queued_events=524288');
    expect(spy.exec).toBeCalledWith('sudo sysctl -p');
  });

  it('warns for unsuccessful patches', async () => {
    const error = new Error('Something went wrong');
    spy.exec.mockRejectedValueOnce(error);
    utils.setPlatform('linux');
    await tools.maybePatchWatchers();
    expect(core.warning).toBeCalledWith(expect.stringContaining("can't patch watchers"));
    expect(core.warning).toBeCalledWith(
      expect.stringContaining('https://github.com/expo/expo-github-action/issues/20')
    );
  });

  it('skips on windows platform', async () => {
    utils.setPlatform('win32');
    await tools.maybePatchWatchers();
    expect(spy.info).toBeCalledWith(expect.stringContaining('Skipping'));
    expect(spy.exec).not.toHaveBeenCalled();
  });

  it('skips on macos platform', async () => {
    utils.setPlatform('darwin');
    await tools.maybePatchWatchers();
    expect(spy.info).toBeCalledWith(expect.stringContaining('Skipping'));
    expect(spy.exec).not.toHaveBeenCalled();
  });

  it('runs on linux platform', async () => {
    utils.setPlatform('linux');
    await tools.maybePatchWatchers();
    expect(spy.info).toBeCalledWith(expect.stringContaining('Patching'));
    expect(spy.exec).toHaveBeenCalled();
  });
});

describe(tools.maybeWarnForUpdate, () => {
  let spy: { [key: string]: jest.SpyInstance } = {};

  beforeEach(() => {
    spy = {
      warning: jest.spyOn(core, 'warning').mockImplementation(),
      resolveVersion: jest.spyOn(packager, 'resolveVersion').mockImplementation(),
    };
  });

  afterAll(() => {
    spy.warning.mockRestore();
    spy.resolveVersion.mockRestore();
  });

  it('is silent when major version is up to date', async () => {
    spy.resolveVersion.mockResolvedValueOnce('4.1.0').mockResolvedValueOnce('4.0.1');
    await tools.maybeWarnForUpdate('eas-cli');
    expect(spy.warning).not.toBeCalled();
  });

  it('warns when major version is outdated', async () => {
    spy.resolveVersion.mockResolvedValueOnce('4.1.0').mockResolvedValueOnce('3.0.1');
    await tools.maybeWarnForUpdate('expo-cli');
    expect(spy.warning).toBeCalledWith('There is a new major version available of the Expo CLI (4.1.0)');
    expect(spy.warning).toBeCalledWith('If you run into issues, try upgrading your workflow to "expo-version: 4.x"');
  });
});

describe(tools.handleError, () => {
  let spy: { [key: string]: jest.SpyInstance } = {};

  beforeEach(() => {
    spy = {
      setFailed: jest.spyOn(core, 'setFailed').mockImplementation(),
      resolveVersion: jest.spyOn(packager, 'resolveVersion').mockImplementation(),
    };
  });

  afterAll(() => {
    spy.setFailed.mockRestore();
    spy.resolveVersion.mockRestore();
  });

  it('marks the job as failed with expo-cli', async () => {
    const error = new Error('test');
    spy.resolveVersion.mockResolvedValue('4.0.0');
    await tools.handleError('expo-cli', error);
    expect(core.setFailed).toBeCalledWith(error);
  });

  it('fails with original error when update warning failed', async () => {
    const error = new Error('test');
    spy.resolveVersion.mockRejectedValue(new Error('npm issue'));
    await tools.handleError('eas-cli', error);
    expect(core.setFailed).toBeCalledWith(error);
  });
});

describe(tools.performAction, () => {
  it('skips the test in a jest environment', async () => {
    utils.setEnv('JEST_WORKER_ID', '69');
    const action = jest.fn();
    const result = await tools.performAction(action);
    expect(result).toBeNull();
    expect(action).not.toBeCalled();
    utils.restoreEnv();
  });

  it('runs the test outside a jest environment', async () => {
    utils.setEnv('JEST_WORKER_ID', '');
    const action = jest.fn();
    const result = await tools.performAction(action);
    expect(result).toBeUndefined();
    expect(action).toBeCalled();
    utils.restoreEnv();
  });
});
