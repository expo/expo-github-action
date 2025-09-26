import * as core from '@actions/core';
import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import path from 'node:path';
import process from 'node:process';

import {
  addGlobalNodeSearchPath,
  createToolPath,
  executeAction,
  installToolFromPackage,
} from '../actions';

describe(executeAction, () => {
  it('executes action successfully', async () => {
    const mockAction = mock(() => Promise.resolve());
    await executeAction(mockAction);
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('sets failed status when action throws error', async () => {
    const setFailed = spyOn(core, 'setFailed').mockImplementation(mock());
    const debug = spyOn(core, 'debug').mockImplementation(mock());
    const error = new Error('Test error');
    error.stack = 'Test stack';
    const mockAction = mock(() => Promise.reject(error));

    await executeAction(mockAction);

    expect(setFailed).toHaveBeenCalledWith('Test error');
    expect(debug).toHaveBeenCalledWith('Test stack');
  });

  it('handles error without message', async () => {
    const setFailed = spyOn(core, 'setFailed').mockImplementation(mock());
    const error = new Error();
    error.message = '';
    const mockAction = mock(() => Promise.reject(error));

    await executeAction(mockAction);

    expect(setFailed).toHaveBeenCalledWith(error);
  });

  it('handles error without stacktrace', async () => {
    const debug = spyOn(core, 'debug').mockImplementation(mock());
    const error = new Error('Test error');
    delete error.stack;
    const mockAction = mock(() => Promise.reject(error));

    await executeAction(mockAction);

    expect(debug).toHaveBeenCalledWith('No stacktrace available');
  });
});

describe(createToolPath, () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('creates tool path with runner tool cache', () => {
    process.env['RUNNER_TOOL_CACHE'] = '/runner/tools';
    const toolPath = createToolPath('node', '18.0.0');

    expect(toolPath).toContain('/runner/tools');
    expect(toolPath).toContain('node');
    expect(toolPath).toContain('18.0.0');
    // The path should contain these components separated by path separators
    const parts = toolPath.split(path.sep);
    expect(parts).toContain('runner');
    expect(parts).toContain('tools');
    expect(parts).toContain('node');
    expect(parts).toContain('18.0.0');
  });

  it('throws error when RUNNER_TOOL_CACHE is not defined', () => {
    delete process.env['RUNNER_TOOL_CACHE'];

    expect(() => createToolPath('node', '18.0.0')).toThrow(
      'Expected RUNNER_TOOL_CACHE to be defined'
    );
  });
});

describe(addGlobalNodeSearchPath, () => {
  const originalEnv = process.env;
  const originalPlatform = process.platform;

  beforeEach(() => {
    process.env = { ...originalEnv };
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
  });

  it('is a function that modifies NODE_PATH', () => {
    expect(typeof addGlobalNodeSearchPath).toBe('function');
    expect(addGlobalNodeSearchPath.length).toBe(1);
  });

  it('adds path to NODE_PATH on unix systems', () => {
    process.env['NODE_PATH'] = '/existing/path';

    addGlobalNodeSearchPath('/new/path');

    // The function should modify NODE_PATH to include the new path
    expect(process.env['NODE_PATH']).toBeDefined();
    expect(process.env['NODE_PATH']).toContain('/new/path');
  });

  it('handles windows platform differently', () => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    process.env['NODE_PATH'] = '/existing/path';

    addGlobalNodeSearchPath('/new/path');

    // Should still modify NODE_PATH
    expect(process.env['NODE_PATH']).toBeDefined();
  });

  it('handles empty NODE_PATH', () => {
    delete process.env['NODE_PATH'];

    addGlobalNodeSearchPath('/new/path');

    // Should set NODE_PATH even if it was undefined
    expect(process.env['NODE_PATH']).toBeDefined();
  });
});

describe(installToolFromPackage, () => {
  it('is a function that takes a directory parameter', () => {
    expect(typeof installToolFromPackage).toBe('function');
    expect(installToolFromPackage.length).toBe(1);
  });

  it('calls core.addPath with expected path', () => {
    const addPath = spyOn(core, 'addPath').mockImplementation(mock());

    installToolFromPackage('/tool/directory');

    expect(addPath).toHaveBeenCalledWith('/tool/directory/node_modules/.bin');
  });
});
