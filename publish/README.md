# Expo Publish for GitHub Actions

> **This sub-action is no longer required and will be removed in the next release.**
> _See the [example workflows](../README.md#example-workflows) for more info._

Publish a brand new release straight from your GitHub workflow.
Optionally, you can configure the release channel or manifest file.

> Make sure to [login](../login) before this step, else your workflow won't have the permission to build a new version

## Usage

Below you can see an example of a publish action.
By default, it will publish to the default release channel with the manifest located at `app.json`.

```hcl
action "Publish to Expo" {
  uses = "bycedric/ci-expo/publish@master"
}
```

### Release channels

You can also use a different release channel, to test before the actual build goes live for example.

```hcl
action "Publish to Expo" {
  uses = "bycedric/ci-expo/publish@master"
  args = "--release-channel staging"
}
```

### Custom manifest

When using non-default locations for the manifest, you can use the `--config` argument.

```hcl
action "Publish to Expo" {
  uses = "bycedric/ci-expo/publish@master"
  args = "--config custom-app.json"
}
```

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.

--- ---

<p align="center">
    with :heart: <a href="https://bycedric.com" target="_blank">byCedric</a>
</p>
