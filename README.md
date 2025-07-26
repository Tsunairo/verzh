# verzh

`verzh` is a simple CLI tool for managing semantic versioning and git tagging in your projects. It helps automate version bumps, tagging, and pushing releases, making your release workflow more reliable and efficient.

## Features

- Bump version numbers (major, minor, patch, pre-release)
- Create annotated git tags for each release
- Push changes and tags to your remote repository
- Interactive prompts to confirm actions and handle uncommitted changes

## 🔧 Usage

Run verzh without installing it globally:

```bash
  npx verzh [command]
```

Or install globally:

```bash
  npm install -g verzh
  verzh [command]
```

⚠️ Windows users: If verzh isn’t recognized after global install, it’s likely because your global npm binaries aren’t in your system PATH. To fix that:

Go to Environment Variables via your Start menu.

Edit the User or System Path.

Add:

```shell
%APPDATA%\npm
```

Restart your terminal or system.

## Commands

| Command             | Description                                     |
| ------------------- | ----------------------------------------------- |
| `verzh init`        | Initialize config and setup                     |
| `verzh bump -t [--type] -f [--force]` | increments the current version or creates a brand new version |
| `verzh set -t [--tag] -f [--force]` | Applies a specified version and sets it as current |
| `verzh push`     | Push an already created version |
| `verzh current`     | Display current version |
| `verzh preceded`     | Display preceded version |

### Init

Set's up the configuration file that determines the workflow of this script.

```sh
verzh init
```

### Bump version

- Bumps the version according to the specified type and creates a git tag. The script will prompt you to confirm the version bump and handle uncommitted changes.
- If you want to specify the type of bump, use the `--type` | `-t` option. Available types are:
  - `patch`
  - `minor`
  - `major`
  - `pre-release`
- If `--type` | `-t` option is not set, the script checks the branch and applies `PATCH` bump for release branch and `PRE-RELEASE` bump for pre-realase branches. 
- If you want to skip the confirmation prompts, use the `--force` | `-f` option.

```sh
verzh bump -t patch
```

### Set version

- Sets the version to the specified tag and creates a git tag. The script will prompt you to confirm the version change and handle uncommitted changes.
- Specify the tag using the `--tag` | `-t` option.
- If you want to skip the confirmation prompts, use the `--force` | `-f` option.

```sh
verzh set -t 1.0.0
```

### Push version

- Push an already created tag to the remote repository.
- If you want to skip the confirmation prompts, use the `--force` | `-f` option.

```sh
verzh push -t 1.0.0
```

### Current version

- Displays the current version of the project based on the `verzh.config.json` file.

```sh
verzh current
```

### Preceded version

- Displays the version that precedes the current version based on the `verzh.config.json` file.

```sh
verzh preceded
```

## Configuration

Edit `verzh.config.json` to set your release branch, remote, and other options. Example:

```json
{
  "current": "1.0.0",
  "precededBy": "",
  "releaseBranch": "main",
  "preReleaseBranches": {
    "develop": "alpha",
    "feature": "beta",
    "hotfix": "rc"
  },
  "autoPushToRemote": false,
  "updatePackageJson": false,
  "remote": "origin"
}
```

For `preReleaseBranches` the key is the branch name and value is the name of the pre-release. This will create tags like `1.0.2-alpa.24`

## License

MIT
