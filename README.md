# verzh

`verzh` is a simple CLI tool for managing semantic versioning and git tagging in your projects. It helps automate version bumps, tagging, and pushing releases, making your release workflow more reliable and efficient.

## Features

- Bump version numbers (major, minor, patch, pre-release)
- Create annotated git tags for each release
- Push changes and tags to your remote repository
- Interactive prompts to confirm actions and handle uncommitted changes

## Installation

Clone this repository and install dependencies:

```sh
npm install -g verzh
```

## Commands

| Command             | Description                                     |
| ------------------- | ----------------------------------------------- |
| `verzh init`        | Initialize config and setup                     |
| `verzh bump [type]` | Bump version by type: `patch`, `minor`, `major` |
<!-- | `verzh set <x.y.z>` | Set version manually                            | -->
<!-- | `verzh version`     | Display current version                         | -->
<!-- | `verzh changelog`   | (Optional) Generate changelog entry             | -->

## Usage

Initialize a new project:

```sh
npx zx src/cli.ts bump [major|minor|patch]
```

Bump version:

```sh
verzh bump
```

You will be prompted to confirm version creation and pushing to remote. The tool will handle git commits, tags, and pushes for you.

## Configuration

Edit `ver.config.json` to set your release branch, remote, and other options. Example:

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

## License

MIT
