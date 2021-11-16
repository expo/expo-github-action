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
    getBoolean: jest.fn((v, d) => (v ? v === 'true' : d)),
    getBinaryName: jest.fn(v => v.replace('-cli', '')),
    resolveVersion: jest.fn((n, v) => v),
    maybeAuthenticate: jest.fn(),
    maybePatchWatchers: jest.fn(),
    maybeWarnForUpdate: jest.fn(),
    handleError: jest.fn(),
    performAction: jest.fn(),
  };
}
