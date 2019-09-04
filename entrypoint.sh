#!/bin/sh -l

set -e

if [ -n "$EXPO_CLI_USERNAME" ] && [ -n "$EXPO_CLI_PASSWORD" ]; then
    expo-cli login --non-interactive --username $EXPO_CLI_USERNAME
else
    echo ''
    echo 'Skipping automatic Expo login, username and/or password not defined.'
    echo '  - https://github.com/expo/expo-github-action#used-secrets'
    echo '  - https://github.com/expo/expo-github-action#example-workflows'
    echo ''
fi

sh -c "expo-cli $*"
