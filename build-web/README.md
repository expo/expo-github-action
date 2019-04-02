# Expo Build Web for GitHub Actions

Create a new app web bundle from your GitHub workflow.
Optionally, you can configure the properties of this bunle.

> Authentication is not required for this step.

## Usage

Below you can see an example of a build web action.

> Just like the [publish](../publish) action, you can customize the web bundle.

```hcl
action "Build web bundle" {
  uses = "bycedric/ci-expo/build-web@master"
}
```

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.

--- ---

<p align="center">
    with :heart: <a href="https://bycedric.com" target="_blank">byCedric</a>
</p>
