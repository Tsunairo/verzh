#!/usr/bin/env zx

import { chalk, $, question } from 'zx';
import { input, select } from '@inquirer/prompts';

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

export const prompt = async (message: string, choices?: {name: string, value: string}[]): Promise<string> => {
  return choices ? await select({
      message: message,
      choices: choices
    })
  : await input({ message: message });
}