#!/bin/sh -l

set -e

if [ -n "$EXPO_USERNAME" ] && [ -n "$EXPO_PASSWORD" ]; then
	expo login --username $EXPO_USERNAME --password $EXPO_PASSWORD
else
	echo "Please define both EXPO_USERNAME and EXPO_PASSWORD."
	exit 1
fi
