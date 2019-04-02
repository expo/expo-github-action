FROM bycedric/ci-expo:2

LABEL com.github.actions.name="Login with Expo (unofficial)"
LABEL com.github.actions.description="Authenticate with Expo your GitHub Actions workflow."
LABEL com.github.actions.icon="log-in"
LABEL com.github.actions.color="gray-dark"

COPY LICENSE.md README.md /
COPY entrypoint.sh /entrypoint-login.sh

ENTRYPOINT ["/entrypoint-login.sh"]
