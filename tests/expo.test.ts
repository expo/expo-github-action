import * as core from '@actions/core';
import * as cli from '@actions/exec';
import * as expo from '../src/expo';
import * as utils from './utils';

const TOKEN = 'ABC123';
const USER = 'bycedric';
const PASS = 'mypassword';

describe('authWithCredentials', () => {
	let spy: { [key: string]: jest.SpyInstance } = {};

	beforeEach(() => {
		spy = {
			exec: jest.spyOn(cli, 'exec').mockImplementation(),
			info: jest.spyOn(core, 'info').mockImplementation(),
		};
	});

	afterAll(() => {
		spy.exec.mockRestore();
		spy.info.mockRestore();
	});

	it('skips authentication without credentials', async () => {
		await expo.authWithCredentials();
		expect(spy.exec).not.toBeCalled();
		expect(spy.info).toBeCalledWith(expect.stringContaining('Skipping authentication'));
	});

	it('skips authentication without password', async () => {
		await expo.authWithCredentials(USER);
		expect(spy.exec).not.toBeCalled();
		expect(spy.info).toBeCalledWith(expect.stringContaining('Skipping authentication'));
	});

	it('executes login command with password through environment', async () => {
		utils.setEnv('TEST_INCLUDED', 'hellyeah');
		await expo.authWithCredentials(USER, PASS);
		expect(spy.exec).toBeCalled();
		expect(spy.exec.mock.calls[0][1]).toStrictEqual(['login', `--username=${USER}`]);
		expect(spy.exec.mock.calls[0][2]).toMatchObject({
			env: {
				TEST_INCLUDED: 'hellyeah',
				EXPO_CLI_PASSWORD: PASS,
			},
		});
		utils.restoreEnv();
	});

	it('fails when credentials are incorrect', async () => {
		const error = new Error('Invalid username/password. Please try again.');
		spy.exec.mockRejectedValue(error);
		await expect(expo.authWithCredentials(USER, PASS)).rejects.toBe(error);
	});

	it('executes login command with `expo` on macos', async () => {
		utils.setPlatform('darwin');
		await expo.authWithCredentials(USER, PASS);
		expect(spy.exec).toBeCalled();
		expect(spy.exec.mock.calls[0][0]).toBe('expo');
		utils.restorePlatform();
	});

	it('executes login command with `expo` on ubuntu', async () => {
		utils.setPlatform('linux');
		await expo.authWithCredentials(USER, PASS);
		expect(spy.exec).toBeCalled();
		expect(spy.exec.mock.calls[0][0]).toBe('expo');
		utils.restorePlatform();
	});

	it('executes login command with `expo.cmd` on windows', async () => {
		utils.setPlatform('win32');
		await expo.authWithCredentials(USER, PASS);
		expect(spy.exec).toBeCalled();
		expect(spy.exec.mock.calls[0][0]).toBe('expo.cmd');
		utils.restorePlatform();
	});
});

describe('authWithToken', () => {
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
		await expo.authWithToken();
		expect(spy.exec).not.toBeCalled();
		expect(spy.info).toBeCalledWith(expect.stringContaining('Skipping authentication'));
	});

	it('executes whoami command with token through environment', async () => {
		utils.setEnv('TEST_INCLUDED', 'hellyeah');
		await expo.authWithToken(TOKEN);
		expect(spy.exec).toBeCalled();
		expect(spy.exec.mock.calls[0][1]).toStrictEqual(['whoami']);
		expect(spy.exec.mock.calls[0][2]).toMatchObject({
			env: {
				TEST_INCLUDED: 'hellyeah',
				EXPO_TOKEN: TOKEN,
			},
		});
		utils.restoreEnv();
	});

	it('fails when token is incorrect', async () => {
		const error = new Error('Not logged in');
		spy.exec.mockRejectedValue(error);
		await expect(expo.authWithToken(TOKEN)).rejects.toBe(error);
	});

	it('executes whoami command with `expo` on macos', async () => {
		utils.setPlatform('darwin');
		await expo.authWithToken(TOKEN);
		expect(spy.exec).toBeCalled();
		expect(spy.exec.mock.calls[0][0]).toBe('expo');
		utils.restorePlatform();
	});

	it('executes whoami command with `expo` on ubuntu', async () => {
		utils.setPlatform('linux');
		await expo.authWithToken(TOKEN);
		expect(spy.exec).toBeCalled();
		expect(spy.exec.mock.calls[0][0]).toBe('expo');
		utils.restorePlatform();
	});

	it('executes whoami command with `expo.cmd` on windows', async () => {
		utils.setPlatform('win32');
		await expo.authWithToken(TOKEN);
		expect(spy.exec).toBeCalled();
		expect(spy.exec.mock.calls[0][0]).toBe('expo.cmd');
		utils.restorePlatform();
	});
});
