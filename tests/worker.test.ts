import * as core from '@actions/core';
import * as exec from '@actions/exec';
import os from 'os';
import path from 'path';

import { tempPath, toolPath, installToolFromPackage, patchWatchers, executeAction } from '../src/worker';
import { resetEnv, setEnv, setPlatform, resetPlatform } from './utils';

jest.mock('@actions/core');
jest.mock('@actions/exec');

describe(tempPath, () => {
  afterEach(resetEnv);

  it('throws when RUNNER_TEMP is undefined', () => {
    setEnv('RUNNER_TEMP', '');
    expect(tempPath).toThrow(`RUNNER_TEMP not defined`);
  });

  it('returns path with name, version, and arch type', () => {
    setEnv('RUNNER_TEMP', 'fake/temp');
    expect(tempPath('expo-cli', '5.0.3')).toBe(path.join('fake', 'temp', 'expo-cli', '5.0.3', os.arch()));
  });
});

describe(toolPath, () => {
  afterEach(resetEnv);

  it('throws when RUNNER_TOOL_CACHE is undefined', () => {
    setEnv('RUNNER_TOOL_CACHE', '');
    expect(toolPath).toThrow(`RUNNER_TOOL_CACHE not defined`);
  });

  it('returns path with name, version, and arch type', () => {
    setEnv('RUNNER_TOOL_CACHE', 'fake/tool');
    expect(toolPath('eas-cli', '0.34.3')).toBe(path.join('fake', 'tool', 'eas-cli', '0.34.3', os.arch()));
  });
});

describe(installToolFromPackage, () => {
  it('registers path to <dir>/node_modules/.bin', () => {
    installToolFromPackage('fake/install');
    expect(core.addPath).toBeCalledWith(path.join('fake', 'install', 'node_modules', '.bin'));
  });
});

describe(patchWatchers, () => {
  afterEach(resetPlatform);

  it('skips patches on windows', async () => {
    setPlatform('win32');
    await patchWatchers();
    expect(exec.exec).not.toBeCalled();
  });

  it('skips patches on macos', async () => {
    setPlatform('darwin');
    await patchWatchers();
    expect(exec.exec).not.toBeCalled();
  });

  it('patches on ubuntu', async () => {
    setPlatform('linux');
    await patchWatchers();
    expect(exec.exec).toBeCalledWith('sudo sysctl fs.inotify.max_user_instances=524288');
    expect(exec.exec).toBeCalledWith('sudo sysctl fs.inotify.max_user_watches=524288');
    expect(exec.exec).toBeCalledWith('sudo sysctl fs.inotify.max_queued_events=524288');
    expect(exec.exec).toBeCalledWith('sudo sysctl -p');
  });

  it('handles exception from commands', async () => {
    setPlatform('linux');
    jest
      .mocked(exec.exec)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockRejectedValueOnce(new Error('fake error'));
    await expect(patchWatchers()).resolves.not.toThrow();
  });
});

describe(executeAction, () => {
  it('executes action', async () => {
    const action = jest.fn(() => Promise.resolve());
    await executeAction(action);
    expect(action).toBeCalled();
  });

  it('handles action errors', async () => {
    const error = new Error('fake error');
    const action = jest.fn(() => Promise.reject(error));
    await expect(executeAction(action)).resolves.not.toThrow();
    expect(core.setFailed).toBeCalledWith(error.message);
  });

  it('provides full stacktrace to debug', async () => {
    const error = new Error('fake error');
    const action = jest.fn(() => Promise.reject(error));
    await expect(executeAction(action)).resolves.not.toThrow();
    expect(core.debug).toBeCalledWith(error.stack);
  });

  it('provides fallback stacktrace to debug', async () => {
    const error = new Error('fake error');
    error.stack = undefined;
    const action = jest.fn(() => Promise.reject(error));
    await expect(executeAction(action)).resolves.not.toThrow();
    expect(core.debug).toBeCalledWith('No stacktrace available');
  });
});
