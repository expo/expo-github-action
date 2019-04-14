FROM bycedric/ci-expo:2

LABEL com.github.actions.name="Expo CLI"
LABEL com.github.actions.description="Use any Expo CLI command in your GitHub Actions workflow."
LABEL com.github.actions.icon="terminal"
LABEL com.github.actions.color="gray-dark"

COPY entrypoint.sh LICENSE.md README.md /

entrypoint ["/entrypoint.sh"]
