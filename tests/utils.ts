import * as core from '@actions/core';

// keep track of the original one to revert the platform
const originalPlatform = process.platform;

/**
 * Change the node platform for testing purposes.
 * With this you can fake the `process.platform`.
 */
export function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value: platform });
}

/**
 * Revert the platform to the original one.
 */
export function restorePlatform(): void {
  setPlatform(originalPlatform);
}

// keep track of the original environment variables
const originalEnv = { ...process.env };

/**
 * Change the environment variable for testing purposes.
 */
export function setEnv(name: string, value: string): void {
  process.env[name] = value;
}

/**
 * Revert the environment variable changes.
 */
export function restoreEnv(): void {
  process.env = originalEnv;
}

/**
 * Get a mocked version of the tools.
 */
export function getToolsMock() {
  return {
    getBinaryName: jest.fn(v => v.replace('-cli', '')),
    maybeAuthenticate: jest.fn(),
    maybePatchWatchers: jest.fn(),
    maybeWarnForUpdate: jest.fn(),
    handleError: jest.fn(),
    performAction: jest.fn(),
  };
}

/**
 * Mock both the input and boolean input methods from `@actions/core`.
 */
export function mockInput(inputs: Record<string, string> = {}) {
  jest.spyOn(core, 'getInput').mockImplementation(name => inputs[name]);
  jest.spyOn(core, 'getBooleanInput').mockImplementation(name => inputs[name] === 'true');
}
