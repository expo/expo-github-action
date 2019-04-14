FROM node:10

LABEL name="Expo for Docker"
LABEL repository="https://github.com/expo/expo-github-action"
LABEL homepage="https://github.com/expo/expo-github-action/blob/master/base"
LABEL maintainer="Cedric van Putten <me+expo-action@bycedric.com>"

RUN npm install --global expo-cli@2 \
	&& npm cache rm --force \
	&& rm -rf ~/.npm

COPY entrypoint.sh LICENSE.md README.md /

ENTRYPOINT ["/entrypoint.sh"]
