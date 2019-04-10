FROM node:10

LABEL name="Expo for Docker"
LABEL repository="https://github.com/bycedric/ci-expo"
LABEL homepage="https://github.com/bycedric/ci-expo/tree/master/base"
LABEL maintainer="Cedric van Putten <me+ci-expo@bycedric.com>"

RUN npm install --global expo-cli@2 \
	&& npm cache rm --force \
	&& rm -rf ~/.npm

COPY entrypoint.sh LICENSE.md README.md /

ENTRYPOINT ["/entrypoint.sh"]
