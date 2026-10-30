import { collectContinuousDeployFingerprintInput } from '../../actions/continuous-deploy-fingerprint';

jest.mock('../../worker');

describe(collectContinuousDeployFingerprintInput, () => {
  it.each([
    { value: '', expected: undefined },
    { value: 'myapp-dev', expected: 'myapp-dev' },
  ])('reads the native scheme override "$value"', ({ value, expected }) => {
    const previous = process.env;
    process.env = {
      ...previous,
      INPUT_PROFILE: 'development',
      INPUT_BRANCH: 'preview-test',
      INPUT_PLATFORM: 'all',
      'INPUT_GITHUB-TOKEN': 'test-token',
      'INPUT_WORKING-DIRECTORY': '.',
      'INPUT_APP-SCHEME': value,
    };
    try {
      expect(collectContinuousDeployFingerprintInput().appScheme).toBe(expected);
    } finally {
      process.env = previous;
    }
  });
});
