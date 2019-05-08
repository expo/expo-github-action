FROM node:10

LABEL name="Expo for Docker"
LABEL repository="https://github.com/expo/expo-github-action"
LABEL homepage="https://github.com/expo/expo-github-action/blob/master/base"
LABEL maintainer="Cedric van Putten <me+expo-action@bycedric.com>"

RUN yarn global add expo-cli@2 \
	&& yarn cache clean

COPY entrypoint.sh LICENSE.md README.md /

ENTRYPOINT ["/entrypoint.sh"]
