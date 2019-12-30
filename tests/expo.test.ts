import * as core from '@actions/core';
import * as cli from '@actions/exec';
import * as expo from '../src/expo';
import { setPlatform, resetPlatform } from './utils';

describe('authenticate', () => {
	const spy = {
		exec: jest.spyOn(cli, 'exec').mockImplementation(),
		info: jest.spyOn(core, 'info').mockImplementation(),
	};

	test('skips authentication without credentials', async () => {
		await expo.authenticate('', '');
		expect(spy.exec).not.toBeCalled();
		expect(spy.info).toBeCalled();
	});

	test('skips authentication without password', async () => {
		await expo.authenticate('bycedric', '');
		expect(spy.exec).not.toBeCalled();
		expect(spy.info).toBeCalled();
	});

	test('executes login command with password through environment', async () => {
		process.env['TEST_INCLUDED'] = 'hellyeah';
		await expo.authenticate('bycedric', 'mypassword');
		expect(spy.exec).toBeCalled();
		expect(spy.exec.mock.calls[0][0]).toBe('expo');
		expect(spy.exec.mock.calls[0][1]).toStrictEqual(['login', '--username=bycedric'])
		expect(spy.exec.mock.calls[0][2]).toMatchObject({
			env: {
				TEST_INCLUDED: 'hellyeah',
				EXPO_CLI_PASSWORD: 'mypassword',
			},
		});
	});

	test('executes login command with `.cmd` suffix on windows', async () => {
		setPlatform('win32');
		await expo.authenticate('bycedric', 'mypassword');
		expect(spy.exec).toBeCalled();
		expect(spy.exec.mock.calls[0][0]).toBe('expo.cmd');
		resetPlatform();
	});
});
