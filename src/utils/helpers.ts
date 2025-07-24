#!/usr/bin/env zx

import { chalk, $, spinner, fs } from 'zx';
import { input, search, select, confirm } from '@inquirer/prompts';
import { isGitRepository, validateConfig } from './validators';
import { PromptChoices, PromptSource, PromptType } from './types';

export const handleError = (error: Error, context: string): void => {
  console.error(chalk.red(`Error in ${context}:`));
  console.error(chalk.red(error.message));
  process.exit(1);
};

export const hasUncommittedChanges = async (): Promise<boolean> => {
  try {
    // Check for staged and unstaged changes
    const { stdout: stagedChanges } = await $`git diff --cached --quiet || echo "staged"`;
    const { stdout: unstagedChanges } = await $`git diff --quiet || echo "unstaged"`;
    
    return !!(stagedChanges || unstagedChanges);
  } catch (error) {
    // Git commands might throw if there are changes
    return true;
  }
};

export const isPushSuccessful = async (commitHash: string): Promise<boolean> => {
  try {
    // Check if commit exists on remote
    const { stdout } = await $`git branch -r --contains ${commitHash}`;
    return stdout.trim().length > 0;
  } catch (error) {
    return false;
  }
};

export async function fetchGitBranches(): Promise<string[]> {
  try {
    // Make sure to fetch latest branches
    await $`git fetch --all --prune`;

    const result = await $`git branch -r`; // List remote branches
    return result.stdout
      .split('\n')
      .map(line => line.trim())
      .filter(branch => !!branch && !branch.includes('->')); // Remove symbolic refs
  } catch (err) {
    console.error('❌ Failed to fetch branches:', err);
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
    console.error('❌ Failed to list git remotes:', err);
    return [];
  }
}

export const prompt = async (message: string, type?: PromptType, choices?: PromptChoices, source?: PromptSource): Promise<string | boolean> => {
  
  switch(type) {
    case 'confirm':
      return await confirm({message});
    case 'search':
      if(source) {
        return await search({message, source});
      }
      else {
        throw Error('Prompt source cant be empty');
      }
    case 'select':
      return await select({message, choices: choices ?? []});
    default:
      return await input({ message: message });
  }
};

export const pullLastest = async () => {
  await spinner('Pulling...', async () => {
    try {
      await $`git pull`;
    }
    catch (error) {
      handleError(error as Error, "Pulling Changes");
      process.exit(1);
    }
  });
};

export const loadConfig = async(configPath: string) => {

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const validateConfigResponse = validateConfig(config);
    if (!validateConfigResponse.isValid) {
      handleError(new Error(validateConfigResponse.message), 'Configuration Validation');
      process.exit(1);
    };
    const isGitRepo = await isGitRepository();
    if (!isGitRepo.isValid) {
      handleError(new Error(isGitRepo.message), 'Git exists');
      process.exit(1);
    };
  }
  catch(error) {
    handleError(error as Error, 'Configuration');
    process.exit(1);
  }
  return config;
};