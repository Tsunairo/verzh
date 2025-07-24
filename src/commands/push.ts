#!/usr/bin/env zx

import { chalk, echo, spinner, fs, $ } from 'zx';
import { VersionConfig } from '../utils/types';
import { doesTagExist, validateConfig } from '../utils/validators';
import { handleError, loadConfig, prompt } from '../utils/helpers';

$.verbose = false
const configPath = "verzh.config.json";

// Initialize with default values
let config: VersionConfig = {
  current: '1.0.0',
  precededBy: '',
  releaseBranch: 'main',
  preReleaseBranches: {},
  autoPushToRemote: false,
  updatePackageJson: false,
  remote: 'origin'
};

const push = async (tag: string, force?: boolean) => {
  config = await loadConfig(configPath);
  const tagExists = await doesTagExist(tag);
  if(tagExists) {
    handleError(new Error("Tag already exists"), "Tag Validation");
    process.exit(1);
  }
  
  let pushChanges =config.autoPushToRemote;
  if (!config.autoPushToRemote) {
    if(!force) {
      const pushInput = await prompt(`\nPush version ${tag}?`, 'confirm');
      if (pushInput) {
        pushChanges = false;
      }
    }
  }
  if (pushChanges) {
    let spinnerError: Error | null = null;
    await spinner(chalk.blueBright(`Pushing version ${tag}...`), async () => {
      try {
        await $`git push -u ${config.remote} ${config.releaseBranch}`;
        await $`git push ${config.remote} ${tag}`;
      } catch (error) {
        spinnerError = error as Error;
      }
    });
    if (spinnerError) {
      handleError(spinnerError, "Pushing Version");
      echo(chalk.redBright(`Failed to push version ${tag}.`));
      process.exit(1);
    } else {
      echo(chalk.greenBright(`Version ${tag} pushed.`));
    }
  } else {
    echo(chalk.yellowBright(`Version ${tag}  not pushed.`));
  }
};

export default push;
