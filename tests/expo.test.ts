import * as core from '@actions/core';
import * as cli from '@actions/exec';
import * as expo from '../src/expo';
import * as utils from './utils';

describe('authenticate', () => {
	const spy = {
		exec: jest.spyOn(cli, 'exec').mockImplementation(),
		info: jest.spyOn(core, 'info').mockImplementation(),
	};

	it('skips authentication without credentials', async () => {
		await expo.authenticate('', '');
		expect(spy.exec).not.toBeCalled();
		expect(spy.info).toBeCalled();
	});

	it('skips authentication without password', async () => {
		await expo.authenticate('bycedric', '');
		expect(spy.exec).not.toBeCalled();
		expect(spy.info).toBeCalled();
	});

	it('executes login command with password through environment', async () => {
		utils.setEnv('TEST_INCLUDED', 'hellyeah');
		await expo.authenticate('bycedric', 'mypassword');
		expect(spy.exec).toBeCalled();
		expect(spy.exec.mock.calls[0][1]).toStrictEqual(['login', '--username=bycedric'])
		expect(spy.exec.mock.calls[0][2]).toMatchObject({
			env: {
				TEST_INCLUDED: 'hellyeah',
				EXPO_CLI_PASSWORD: 'mypassword',
			},
		});
		utils.restoreEnv();
	});

	it('executes login command with `expo` on macos', async () => {
		utils.setPlatform('darwin');
		await expo.authenticate('bycedric', 'mypassword');
		expect(spy.exec).toBeCalled();
		expect(spy.exec.mock.calls[0][0]).toBe('expo');
		utils.restorePlatform();
	});

	it('executes login command with `expo` on ubuntu', async () => {
		utils.setPlatform('linux');
		await expo.authenticate('bycedric', 'mypassword');
		expect(spy.exec).toBeCalled();
		expect(spy.exec.mock.calls[0][0]).toBe('expo');
		utils.restorePlatform();
	});

	it('executes login command with `expo.cmd` on windows', async () => {
		utils.setPlatform('win32');
		await expo.authenticate('bycedric', 'mypassword');
		expect(spy.exec).toBeCalled();
		expect(spy.exec.mock.calls[0][0]).toBe('expo.cmd');
		utils.restorePlatform();
	});

	it('fails when credentials are incorrect', async () => {
		const error = new Error('Invalid username/password. Please try again.');
		spy.exec.mockRejectedValue(error);
		await expect(expo.authenticate('bycedric', 'incorrect')).rejects.toBe(error);
	});
});
