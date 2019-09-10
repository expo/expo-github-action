import { addPath, getInput } from '@actions/core';
import { authenticate } from './expo';
import { install } from './install';

export async function run() {
    const path = await install(
        getInput('expo-version') || 'latest',
        getInput('expo-packager') || 'npm',
    );

    addPath(path);

    await authenticate(
        getInput('expo-username'),
        getInput('expo-password'),
    );
}

run();
