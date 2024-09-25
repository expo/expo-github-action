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
export function resetPlatform(): void {
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
export function resetEnv(): void {
  process.env = originalEnv;
}

/**
 * Mock both the input and boolean input methods from `@actions/core`.
 */
export function mockInput(inputs: Record<string, string> = {}) {
  jest.mocked(core.getInput).mockImplementation(name => inputs[name]);
  jest.mocked(core.getBooleanInput).mockImplementation(name => inputs[name] === 'true');
}
