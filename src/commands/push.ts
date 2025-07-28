#!/usr/bin/env zx

import { chalk, echo, spinner, $ } from 'zx';
import { VersionConfig } from '../utils/types';
import { validateTagExists } from '../utils/validators';
import { handleError } from '../utils/helpers';
import { confirm } from '@inquirer/prompts';
import getConfig from './getConfig';

$.verbose = false;

// Initialize with default values
let config: VersionConfig = {
  name: '',
  current: '1.0.0',
  precededBy: '',
  releaseBranch: 'main',
  preReleaseBranches: {},
  autoPushToRemote: false,
  updatePackageJson: false,
  remote: 'origin'
};

const push = async (tag: string, force?: boolean, isEnvValidated?: boolean) => {
  try {
    config = await getConfig(isEnvValidated);
  
    const validateTagExistsResponse = await validateTagExists(tag);
    if(!validateTagExistsResponse.isValid) {
      throw new Error(validateTagExistsResponse.message);
    }
    
    let pushChanges =config.autoPushToRemote;
    if (!config.autoPushToRemote) {
      if(!force) {
        const pushInput = await confirm({message: `Push version ${tag}?`});
        if (!pushInput) {
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
        throw spinnerError;
      } else {
        echo(chalk.greenBright(`Version ${tag} pushed.`));
      }
    } else {
      echo(chalk.yellowBright(`Version ${tag} not pushed.`));
    }
  }
  catch(error) {
    handleError(error as Error, 'Setting Version');
    process.exit(1);
  }
  finally {
    process.exit(0);
  }
};

export default push;
