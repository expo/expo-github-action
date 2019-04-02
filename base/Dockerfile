FROM node:10

LABEL name="Expo for Docker"
LABEL version="2.0.0"
LABEL repository="https://github.com/bycedric/ci-expo"
LABEL homepage="https://github.com/bycedric/ci-expo/tree/master/base"
LABEL maintainer="Cedric van Putten <me+ci-expo@bycedric.com>"

RUN npm install --global expo-cli@2 \
	&& npm cache rm --force \
	&& rm -rf ~/.npm

COPY LICENSE.md README.md /
COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["--help"]
