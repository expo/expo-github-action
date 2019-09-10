import * as core from '@actions/core';
import { authenticate } from './expo';
import { install } from './install';

async function run() {
    const path = await install(
        core.getInput('expo-version') || 'latest',
        core.getInput('expo-packager') || 'npm',
    );

    core.addPath(path);

    await authenticate(
        core.getInput('expo-username'),
        core.getInput('expo-password'),
    );
}

run();
