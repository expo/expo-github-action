FROM bycedric/expo-cli:2

LABEL com.github.actions.name="Expo CLI"
LABEL com.github.actions.description="Use any Expo CLI command in your GitHub Actions workflow."
LABEL com.github.actions.icon="terminal"
LABEL com.github.actions.color="gray-dark"

COPY entrypoint.sh LICENSE.md README.md /

# increase node's default memory limit to 4gb
# see: https://github.com/expo/expo-github-action/#overwriting-node_options
ENV NODE_OPTIONS="--max_old_space_size=4096"

entrypoint ["/entrypoint.sh"]
