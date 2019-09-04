FROM bycedric/expo-cli:3

COPY entrypoint.sh LICENSE.md README.md /

# move the entry point as proxy command for expo itself
# see: https://github.com/expo/expo-github-action/#automatic-expo-login
RUN mv entrypoint.sh /usr/local/bin/expo

# increase node's default memory limit to 4gb
# see: https://github.com/expo/expo-github-action/#overwriting-node_options
ENV NODE_OPTIONS="--max_old_space_size=4096"

ENTRYPOINT ["/usr/local/bin/expo"]
