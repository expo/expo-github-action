# Expo Build iOS for GitHub Actions

Create a new standalone iOS build from your GitHub workflow.
Optionally, you can configure the properties of this standalone app.

> Make sure to [login](../login) before this step, else your workflow won't have the permission to build a new version

## Usage

Below you can see an example of a build iOS action.

> Just like the [publish](../publish) action, you can customize the iOS app.

```hcl
action "Build iOS app" {
  uses = "bycedric/ci-expo/build-ios@master"
}
```

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.

--- ---

<p align="center">
    with :heart: <a href="https://bycedric.com" target="_blank">byCedric</a>
</p>
