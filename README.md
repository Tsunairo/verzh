# verzh

`verzh` is a simple CLI tool for managing semantic versioning and git tagging in your projects. It helps automate version bumps, tagging, and pushing releases, making your release workflow more reliable and efficient.

## Features

- Bump version numbers (major, minor, patch, pre-release)
- Automatically update `ver.config.json` with the new version
- Create annotated git tags for each release
- Push changes and tags to your remote repository
- Interactive prompts to confirm actions and handle uncommitted changes

## Installation

Clone this repository and install dependencies:

```sh
git clone <repo-url>
cd ver
npm install
```

## Usage

Run the CLI to bump your project's version:

```sh
npx zx src/cli.ts bump [major|minor|patch]
```

Or, if you have it set up as an npm script:

```sh
npm run bump -- [major|minor|patch]
```

You will be prompted to confirm version creation and pushing to remote. The tool will handle git commits, tags, and pushes for you.

## Configuration

Edit `ver.config.json` to set your release branch, remote, and other options. Example:

```json
{
  "current": "1.0.0",
  "precededBy": "",
  "releaseBranch": "main",
  "preReleaseBranches": {},
  "autoPushToRemote": false,
  "pushedToRemote": [],
  "remote": "origin"
}
```

## License

MIT
