FROM bycedric/expo-cli:3

COPY entrypoint.sh LICENSE.md README.md /

# increase node's default memory limit to 4gb
# see: https://github.com/expo/expo-github-action/#overwriting-node_options
ENV NODE_OPTIONS="--max_old_space_size=4096"

ENTRYPOINT ["/entrypoint.sh"]
