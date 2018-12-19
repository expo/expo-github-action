FROM node:10-alpine

LABEL name="Expo CLI for Docker"
LABEL repository="https://github.com/bycedric/ci-expo"
LABEL homepage="https://github.com/bycedric/ci-expo/tree/master/base"
LABEL maintainer="Cedric van Putten <me+ci-expo@bycedric.com>"

RUN apk add --no-cache bash git \
	&& npm install --global expo-cli@2 \
	&& npm cache rm --force \
	&& rm -rf ~/.npm

COPY LICENSE.md README.md THIRD_PARTY_NOTICE.md /
COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["--help"]
