## [5.3.1](https://github.com/expo/expo-github-action/compare/5.3.0...5.3.1) (2020-10-20)

### Other chores

* bump @actions/core from 1.2.4 to 1.2.6 ([#63](https://github.com/expo/expo-github-action/pull/63)) ([b807fa6](https://github.com/expo/expo-github-action/commit/b807fa6))


## [5.3.0](https://github.com/expo/expo-github-action/compare/5.2.0...5.3.0) (2020-09-19)

### New features

* add expo token authentication method ([#57](https://github.com/expo/expo-github-action/pull/57)) ([1c36889](https://github.com/expo/expo-github-action/commit/1c36889))


## [5.2.0](https://github.com/expo/expo-github-action/compare/5.1.1...5.2.0) (2020-07-14)

### Bug fixes

* proper space between icon and text ([#50](https://github.com/expo/expo-github-action/pull/50)) ([b8a49f4](https://github.com/expo/expo-github-action/commit/b8a49f4))

### Code refactors

* use github actions instead of circle ([#54](https://github.com/expo/expo-github-action/pull/54)) ([d3602b9](https://github.com/expo/expo-github-action/commit/d3602b9))

### Documentation changes

* fix grammar and link in readme ([#53](https://github.com/expo/expo-github-action/pull/53)) ([6ac67f0](https://github.com/expo/expo-github-action/commit/6ac67f0))
* update build badge in readme ([#56](https://github.com/expo/expo-github-action/pull/56)) ([050b701](https://github.com/expo/expo-github-action/commit/050b701))

### Other chores

* upgrade all dependencies to latest version ([#55](https://github.com/expo/expo-github-action/pull/55)) ([404bd09](https://github.com/expo/expo-github-action/commit/404bd09))


## [5.1.1](https://github.com/expo/expo-github-action/compare/5.1.0...5.1.1) (2020-06-10)

### Bug fixes

* use inputs metadata key ([#49](https://github.com/expo/expo-github-action/pull/49)) ([71dfeab](https://github.com/expo/expo-github-action/commit/71dfeab))


## [5.1.0](https://github.com/expo/expo-github-action/compare/5.0.0...5.1.0) (2020-05-08)

### New features

* fail when provided credentials are incorrect ([#43](https://github.com/expo/expo-github-action/pull/43)) ([a7b6ce4](https://github.com/expo/expo-github-action/commit/a7b6ce4))

### Bug fixes

* remove custom and add global error handling ([#46](https://github.com/expo/expo-github-action/pull/46)) ([a4955da](https://github.com/expo/expo-github-action/commit/a4955da))

### Test changes

* check if build is up to date ([#45](https://github.com/expo/expo-github-action/pull/45)) ([cb49096](https://github.com/expo/expo-github-action/commit/cb49096))
* add missing cache unit tests ([#44](https://github.com/expo/expo-github-action/pull/44)) ([4279327](https://github.com/expo/expo-github-action/commit/4279327))

### Other chores

* update dependencies and configuration ([#42](https://github.com/expo/expo-github-action/pull/42)) ([32b5f9c](https://github.com/expo/expo-github-action/commit/32b5f9c))
* **deps**: bump acorn from 5.7.3 to 5.7.4 ([#37](https://github.com/expo/expo-github-action/pull/37)) ([4aaf05f](https://github.com/expo/expo-github-action/commit/4aaf05f))


## [5.0.0](https://github.com/expo/expo-github-action/compare/4.1.0...5.0.0) (2019-12-31)

### BREAKING CHANGES

* use yarn by default instead of npm ([#32](https://github.com/expo/expo-github-action/pull/32)) ([2de5b8c3](https://github.com/expo/expo-github-action/commit/2de5b8c))
* use ncc to compile scripts ([#31](https://github.com/expo/expo-github-action/pull/31)) ([48288d58](https://github.com/expo/expo-github-action/commit/48288d5))

### New features

* implement caching using github actions cache ([#35](https://github.com/expo/expo-github-action/pull/35)) ([69801f0a](https://github.com/expo/expo-github-action/commit/69801f0))

### Code refactors

* move index code to run ([#33](https://github.com/expo/expo-github-action/pull/33)) ([f80ef1f6](https://github.com/expo/expo-github-action/commit/f80ef1f))
* use yarn by default instead of npm ([#32](https://github.com/expo/expo-github-action/pull/32)) ([2de5b8c3](https://github.com/expo/expo-github-action/commit/2de5b8c))
* use ncc to compile scripts ([#31](https://github.com/expo/expo-github-action/pull/31)) ([48288d58](https://github.com/expo/expo-github-action/commit/48288d5))
* make logs more visible ([#30](https://github.com/expo/expo-github-action/pull/30)) ([12f58a21](https://github.com/expo/expo-github-action/commit/12f58a2))
* update all dependencies to latest versions ([#29](https://github.com/expo/expo-github-action/pull/29)) ([7776e33f](https://github.com/expo/expo-github-action/commit/7776e33))
* use circleci instead of github actions ([#28](https://github.com/expo/expo-github-action/pull/28)) ([e5677e1f](https://github.com/expo/expo-github-action/commit/e5677e1))

### Documentation changes

* update the default packager value in action ([#34](https://github.com/expo/expo-github-action/pull/34)) ([3ac4a96c](https://github.com/expo/expo-github-action/commit/3ac4a96))

### Other chores

* **deps**: bump handlebars from 4.2.0 to 4.5.3 ([#27](https://github.com/expo/expo-github-action/pull/27)) ([4aa2c230](https://github.com/expo/expo-github-action/commit/4aa2c23))


## [4.1.0](https://github.com/expo/expo-github-action/compare/4.0.1...4.1.0) (2019-10-30)

### Bug fixes

* use cmd suffix when authenticating on windows ([831bcb1](https://github.com/expo/expo-github-action/commit/831bcb1))

### Documentation changes

* remove beta warning just before general availability ([68a2de0](https://github.com/expo/expo-github-action/commit/68a2de0))

### Other chores

* update all dependencies to latest version ([16d4b15](https://github.com/expo/expo-github-action/commit/16d4b15))
* enable workflow for pull requests ([8ff07e0](https://github.com/expo/expo-github-action/commit/8ff07e0))


## [4.0.0](https://github.com/expo/expo-github-action/compare/3.0.0...4.0.0) (2019-09-29)

### New features

* add github workflow for ci ([929a76c](https://github.com/expo/expo-github-action/commit/929a76c))
* add new expo action cli install concept ([98b1bea](https://github.com/expo/expo-github-action/commit/98b1bea))
* use new action metadata format ([81344e4](https://github.com/expo/expo-github-action/commit/81344e4))

### Bug fixes

* add build and node node modules before commit ([00692c4](https://github.com/expo/expo-github-action/commit/00692c4))
* add build and node node modules in husky hook ([b2929e3](https://github.com/expo/expo-github-action/commit/b2929e3))

### Code refactors

* remove travis config and base images ([e72ddd8](https://github.com/expo/expo-github-action/commit/e72ddd8))
* move entry point to expo as proxy ([caf499b](https://github.com/expo/expo-github-action/commit/caf499b))
* update proxy for non-interactive mode and help links ([5cfaee2](https://github.com/expo/expo-github-action/commit/5cfaee2))

### Documentation changes

* update documentation for the new action ([38e963b](https://github.com/expo/expo-github-action/commit/38e963b))
* simplify and link the environment variables info ([26c734a](https://github.com/expo/expo-github-action/commit/26c734a))
* replace aliased email with normal email ([f3bc71a](https://github.com/expo/expo-github-action/commit/f3bc71a))
* write about entry point proxy and restructure for easy access ([4766fa8](https://github.com/expo/expo-github-action/commit/4766fa8))
* update license dates ([89005bc](https://github.com/expo/expo-github-action/commit/89005bc))

### Other chores

* add linter and fix all files ([04cd479](https://github.com/expo/expo-github-action/commit/04cd479))
* add husky for repository deployments ([cec6e50](https://github.com/expo/expo-github-action/commit/cec6e50))
* add all missing tests ([22df52e](https://github.com/expo/expo-github-action/commit/22df52e))


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
