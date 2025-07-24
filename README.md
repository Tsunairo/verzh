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
| `verzh bump -t [type] -f` | [-t, --type]: `patch`, `minor`, `major`, `pre-release` [-f, --force]: run without user inputs |
| `verzh current`     | Display current version                         |

Initialize a new project:

Set's up the configuration file that determines the workflow of this script.
`Note` this will first 
```sh
verzh init
```


Bump version:

```sh
verzh bump -t patch
```

If `--type` | `-t` option is not set, the script checks the branch and applies `PATCH` bump for release branch and `PRE-RELEASE` bump for pre-relase branches. Using the `--force` | `-f` option runs the script without any user input.

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
