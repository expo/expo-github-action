const core = { addPath: jest.fn(), getInput: jest.fn() };
const expo = { authenticate: jest.fn() };
const install = { install: jest.fn() };

jest.mock('@actions/core', () => core);
jest.mock('../src/expo', () => expo);
jest.mock('../src/install', () => install);

import { run } from '../src/index';

describe('run', () => {
	test('installs latest expo-cli with npm by default', async () => {
		await run();
		expect(install.install).toBeCalledWith('latest', 'npm');
	});

	test('installs provided version expo-cli with yarn', async () => {
		// fix: kind of dirty workaround for missing "mock 'value' for arg 'expo-version'"
		core.getInput.mockReturnValueOnce('3.0.10');
		core.getInput.mockReturnValueOnce('yarn');
		await run();
		expect(install.install).toBeCalledWith('3.0.10', 'yarn');
	});

	test('installs path to global path', async () => {
		install.install.mockResolvedValue('/expo/install/path');
		await run();
		expect(core.addPath).toBeCalledWith('/expo/install/path');
	});

	test('authenticates with provided credentials', async () => {
		// fix: kind of dirty workaround for missing "mock 'value' for arg 'expo-version'"
		core.getInput.mockReturnValueOnce('irrelevant');
		core.getInput.mockReturnValueOnce('irrelevant');
		core.getInput.mockReturnValueOnce('bycedric');
		core.getInput.mockReturnValueOnce('mypassword');
		await run();
		expect(expo.authenticate).toBeCalledWith('bycedric', 'mypassword');
	});
});
