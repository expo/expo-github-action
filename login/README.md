# Expo Login for GitHub Actions

Authenticate the current workflow to publish new versions or create new builds.
It works relatively simple, you define the Expo credentials and this action will do the rest.

## Usage

First you need to define the [secrets listed below][#secrets] through [GitHub secrets](https://developer.github.com/actions/managing-workflows/storing-secrets/).
After that, you can add the action below in your workflow.

```hcl
action "Login with Expo" {
  uses = "bycedric/ci-expo/login@master"
  secrets = ["EXPO_USERNAME", "EXPO_PASSWORD"]
}
```

### Secrets

* `EXPO_USERNAME` - **Required**. The email address or username of the Expo account.
* `EXPO_PASSWORD` - **Required**. The password of the Expo account.

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.

--- ---

<p align="center">
    with :heart: <a href="https://bycedric.com" target="_blank">byCedric</a>
</p>
