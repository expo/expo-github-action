## [3.0.0](https://github.com/expo/expo-github-action/compare/2.3.2...3.0.0) (2019-07-23)

## Code refactors

* run travis in parallel for expo cli v2 and v3 ([882d5f9](https://github.com/expo/expo-github-action/commit/882d5f9))
* add latest expo-cli v3 but keep v2 images updated ([cd33736](https://github.com/expo/expo-github-action/commit/cd33736))


## [2.3.2](https://github.com/expo/expo-github-action/compare/2.3.1...2.3.2) (2019-05-09)

### Bug fixes

* use yarn to install expo cli globally ([9fd3635](https://github.com/expo/expo-github-action/commit/9fd3635))


## [2.3.1](https://github.com/expo/expo-github-action/compare/2.3.0...2.3.1) (2019-04-17)

### Bug fixes

* increase node memory limit to 4gb ([4c25ef9](https://github.com/expo/expo-github-action/commit/4c25ef9))

### Documentation changes

* add note about overwriting node options ([aa752f2](https://github.com/expo/expo-github-action/commit/aa752f2))
* add extra link to base image in description ([fa42241](https://github.com/expo/expo-github-action/commit/fa42241))
* rename build action to remove ambiguity with other examples ([92beb0f](https://github.com/expo/expo-github-action/commit/92beb0f))

### Other chores

* make travis build the action to double check the docker file ([698a1c6](https://github.com/expo/expo-github-action/commit/698a1c6))


## [2.3.0](https://github.com/expo/expo-github-action/compare/2.2.0...2.3.0) (2019-04-14)

### New features

* build docker base image from travis ci ([0ce8eff](https://github.com/expo/expo-github-action/commit/0ce8eff))

### Code refactors

* update base image labels ([4e2fd4d](https://github.com/expo/expo-github-action/commit/4e2fd4d))
* remove unofficial from the name ([b8ec502](https://github.com/expo/expo-github-action/commit/b8ec502))
* remove deprecated subactions ([0cfae07](https://github.com/expo/expo-github-action/commit/0cfae07))

### Documentation changes

* add scheduled builds info and update examples ([a801b83](https://github.com/expo/expo-github-action/commit/a801b83))
* add travis link to base image builds ([2c88f88](https://github.com/expo/expo-github-action/commit/2c88f88))
* add 650 industries aka expo as license holder ([3f55e8c](https://github.com/expo/expo-github-action/commit/3f55e8c))
* add 650 industries aka expo as license holder ([fe86cd6](https://github.com/expo/expo-github-action/commit/fe86cd6))
* update references to action repository ([617ebf8](https://github.com/expo/expo-github-action/commit/617ebf8))
* use latest npm action because of an install failure ([e6a3b5c](https://github.com/expo/expo-github-action/commit/e6a3b5c))


## [2.2.0](https://github.com/expo/expo-github-action/compare/2.1.0...2.2.0) (2019-04-10)

### Code refactors

* use better expo cli variables prefix ([cd75584](https://github.com/expo/expo-github-action/commit/cd75584))

### Documentation changes

* pin actions to versions for future releases ([3c76843](https://github.com/expo/expo-github-action/commit/3c76843))


## [2.1.0](https://github.com/expo/expo-github-action/compare/2.0.0...2.1.0) (2019-04-10)

### Code refactors

* authenticate in main action if possible ([a401e30](https://github.com/expo/expo-github-action/commit/a401e30))
* remove extraneous commands from base image ([a90ce59](https://github.com/expo/expo-github-action/commit/a90ce59))

### Documentation changes

* add deprecation notice on all sub-actions ([b5a0311](https://github.com/expo/expo-github-action/commit/b5a0311))
* add examples and more contextual info ([9625bb1](https://github.com/expo/expo-github-action/commit/9625bb1))
* fix typo in documentation and use link references ([48bbaf3](https://github.com/expo/expo-github-action/commit/48bbaf3))
* update license to 2019 ([7596f6b](https://github.com/expo/expo-github-action/commit/7596f6b))

### Other chores

* add some issue templates to github ([9aec1f5](https://github.com/expo/expo-github-action/commit/9aec1f5))


## [2.0.0](https://github.com/expo/expo-github-action/compare/906c910...2.0.0) (2019-04-02)

### New features

* add basic ios build action ([3a81415](https://github.com/expo/expo-github-action/commit/3a81415))
* add basic web build action ([3d4bdb6](https://github.com/expo/expo-github-action/commit/3d4bdb6))
* add basic android build action ([9105177](https://github.com/expo/expo-github-action/commit/9105177))
* add new publish action ([56563f2](https://github.com/expo/expo-github-action/commit/56563f2))
* add login entrypoint ([252f16d](https://github.com/expo/expo-github-action/commit/252f16d))
* add github actions implemented image for expo cli ([864b9bb](https://github.com/expo/expo-github-action/commit/864b9bb))
* add base image with documentation and licenses ([c43e5c3](https://github.com/expo/expo-github-action/commit/c43e5c3))

### Code refactors

* tag all buid actions as unofficial for release ([ed597e5](https://github.com/expo/expo-github-action/commit/ed597e5))
* simplify publish action and remove extraneous entrypoint ([61d0c21](https://github.com/expo/expo-github-action/commit/61d0c21))
* tag all actions as unofficial for release to marketplace ([f56443a](https://github.com/expo/expo-github-action/commit/f56443a))
* expand existing login with documentation and proper icon ([d2e2a6d](https://github.com/expo/expo-github-action/commit/d2e2a6d))
* move cli to root as default ([4545e44](https://github.com/expo/expo-github-action/commit/4545e44))
* expand existing login with documentation and proper icon ([923ed34](https://github.com/expo/expo-github-action/commit/923ed34))
* remove third party notice until its updated ([f4fc39a](https://github.com/expo/expo-github-action/commit/f4fc39a))
* use full node version instead of alpine ([a019c94](https://github.com/expo/expo-github-action/commit/a019c94))

### Documentation changes

* add link to login from publish action ([5b7564c](https://github.com/expo/expo-github-action/commit/5b7564c))
* add custom cli command action ([4cf38f9](https://github.com/expo/expo-github-action/commit/4cf38f9))
* add do not use in production warning ([8291794](https://github.com/expo/expo-github-action/commit/8291794))
* add basic repository description ([906c910](https://github.com/expo/expo-github-action/commit/906c910))

### Other chores

* remove the cli from name ([ab9265b](https://github.com/expo/expo-github-action/commit/ab9265b))
