# Expo CLI for Docker

A prebuilt docker image to use the [Expo CLI](https://docs.expo.io/versions/latest/workflow/expo-cli) on Docker-based environments.
This image contains all necessary libraries to perform all commands of the CLI.

- Based on `node:10-alpine` image
- Contains globally installed `expo-cli@2`
- Contains `bash` for [Metro bundler](https://facebook.github.io/metro/)
- Contains `git` for NPM repository references

## Usage

The entry point of this image forwards to the Expo CLI itself.
With this entry point you can provide any command directly to Docker.
When nothing is provided, it will output the help information provided by the CLI.

```bash
$ docker run --rm bycedric/ci-expo
$ docker run --rm bycedric/ci-expo pubish
$ docker run --rm -ti bycedric/ci-expo login
$ docker run --rm -ti --entrypoint sh bycedric/ci-expo
```

> This image is intended to use on Docker-based CI environments, see [the Expo CI guide](https://docs.expo.io/versions/latest/guides/setting-up-continuous-integration) to get started.

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.

> This image is built on top of awesome open source libraries, see [third party licenses](THIRD_PARTY_NOTICE.md) for more information.

--- ---

<p align="center">
    with :heart: <a href="https://bycedric.com" target="_blank">byCedric</a>
</p>
