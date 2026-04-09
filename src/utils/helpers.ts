import { chalk, $, spinner, ProcessOutput, echo } from 'zx';
import { VersionConfig } from './types';

export const handleError = (error: Error, context: string): void => {
  console.error(chalk.red(`Error in ${context}:`));
  console.error(chalk.red(error.message));
};

export async function fetchGitBranches(): Promise<string[]> {
  try {
    // Make sure to fetch latest branches
    const remotes = await fetchGitRemotes();
    if (remotes.length > 0) {
      await $`git fetch --all --prune`;
    }

    const result = await $`git branch`; // local branches

    return result.stdout
      .split('\n')
      .map(line => line.trim().replace(/^\*\s*/, '')) // remove leading '* ' if present
      .filter(branch => !!branch && !branch.includes('->')); // clean result
  } catch (err) {
    const error = err as ProcessOutput;
    echo(chalk.redBright(`\nFailed to list git branches\n\n ${error.stderr} \n ******`,));
    return [];
  }
}


export async function fetchGitRemotes(): Promise<string[]> {
  try {
    const result = await $`git remote`;
    return result.stdout
      .split('\n')
      .map(remote => remote.trim())
      .filter(remote => remote.length > 0);
  } catch (err) {
    const error = err as ProcessOutput;
    echo(chalk.redBright(`\nFailed to list git remotes\n\n ${error.stderr} \n ******`,));
    return [];
  }
};

export async function getGitLogsBetweenTags(tag1: string, tag2: string): Promise<string[]> {

  const result = await $`git log --oneline ${tag1}..${tag2}`;

  return result.stdout
    .split('\n')
    .map(commit => commit.trim())
    .filter(commit => commit.length > 0);
}

export async function getGitRemoteUrl(remote: string) {
  try {
    const result = await $`git remote get-url ${remote}`;
    return result.stdout;
  } catch (err) {
    const error = err as ProcessOutput;
    echo(chalk.redBright(`\nFailed to get git remote url\n\n ${error.stderr} \n ******`,));
    return '';
  }
}

export async function generateReleaseNotesTemplate(currentTag: string, previousTag: string, remote: string) {
  const logs = await getGitLogsBetweenTags(currentTag, previousTag)
  const remoteUrl = await getGitRemoteUrl(remote);
  const dateTime = new Date().toISOString();
  const template = `
    ${remote ? `# [${currentTag}](${remoteUrl}/compare/${previousTag}...${currentTag})` : `# ${currentTag}`} (${dateTime})

    > Description

    ## Upgrade Steps

      *
      *

    ## Breaking Changes
      
      *
      *

    ## New Features

      *
      *
    ## Bug Fixes

      *
      *

    ## Performance Improvements

      *
      *

    ## Other Changes

      ${logs.map(log => `* ${log}\n`)}

  `;

  return template
}



export const pullLatest = async () => {
  const remotes = await fetchGitRemotes();
  if (remotes.length > 0) {
    await spinner('Pulling...', async () => {
      try {
        await $`git pull`;
      }
      catch (error) {
        handleError(error as Error, "Pulling Changes");
        process.exit(1);
      }
    });
  }
};

export const performPreScripts = async (config: VersionConfig) => {
  let spinnerError: Error | null = null;
  let isSuccess = false;

  await spinner(chalk.blueBright("Performing pre script, please wait"), async () => {
    try {
      const process = await $`${config.preScript}`;
      if (process.exitCode === 0) {
        isSuccess = true;
      }
    } catch (error) {
      handleError(error as Error, "Performing pre script");
      process.exit(1);
    }
  });
  if (isSuccess) {
    console.log(chalk.greenBright(`Pre Script worked successfully`));
  }
};
