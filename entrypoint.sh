#!/bin/sh -l

set -e

if [ -n "$EXPO_USERNAME" ] && [ -n "$EXPO_PASSWORD" ]; then
	expo login --username $EXPO_USERNAME --password $EXPO_PASSWORD
else
	echo 'Skipping Expo login, username and/or password not defined...'
fi

sh -c "expo $*"
