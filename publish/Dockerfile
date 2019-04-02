FROM bycedric/ci-expo:2

LABEL com.github.actions.name="Publish to Expo (unofficial)"
LABEL com.github.actions.description="Publish a new release to Expo in your GitHub Actions workflow."
LABEL com.github.actions.icon="box"
LABEL com.github.actions.color="gray-dark"

COPY LICENSE.md README.md /

ENTRYPOINT ["/entrypoint.sh", "publish"]
