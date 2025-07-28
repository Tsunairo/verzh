#!/usr/bin/env zx

import { chalk, echo, spinner, fs, $ } from 'zx';
import { VersionConfig } from '../utils/types';
import { validateTagExists, validateBranchAndTag } from '../utils/validators';
import { handleError, hasUncommittedChanges, pullLatest } from '../utils/helpers';
import push from './push';
import { confirm } from '@inquirer/prompts';
import getConfig from './getConfig';

$.verbose = false;
const configPath = "verzh.config.json";

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

const createVersion = async (tag: string, force?: boolean): Promise<void> => {
  if(!force) {
    if (await hasUncommittedChanges()) {
      const proceed = await confirm(
        {message: chalk.yellow('\nThere are uncommitted changes in your working directory. Proceed anyway? ')}
      );
      
      if (!proceed) {
        echo(chalk.yellowBright('Version creation cancelled. Please commit or stash your changes first.'));
        process.exit(1);
      }
    }
  }
  if(config.updatePackageJson) {
    try {
      const packageJsonPath = 'package.json';
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        packageJson.version = tag;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        echo(chalk.greenBright(`Updated version in ${packageJsonPath} to ${tag}`));
      }
    }
    catch(error) {
      handleError(error as Error, "Updating package.json");
      return;
    }
  }
  let spinnerError: Error | null = null;
  await spinner(chalk.blueBright("Creating version " + tag), async () => {
    config = { ...config, current: tag, precededBy: config.current };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    try {
      await $`git add .`;
      await $`git commit -m"Version: ${tag}"`;
      await $`git tag -a ${tag} -m "Version: ${tag}"`;
    } catch (error) {
      spinnerError = error as Error;
    }
  });
  if (spinnerError) {
    handleError(spinnerError, "Pushing Version");
    return;
  }
  echo(chalk.greenBright(`Version ${tag} created 👍✅!`));
  await push(tag, force, true);
};

const set = async (tag: string, force?: boolean, isBranchAndTagValidated?: boolean, isPulled?: boolean, isEnvValidated?: boolean): Promise<void> => {
  try {
    config = await getConfig(isEnvValidated);

    let branch: string = (await $`git rev-parse --abbrev-ref HEAD`).stdout.trim();
    if(!isBranchAndTagValidated) {
      const validateBranchAndTagResponse = await validateBranchAndTag(branch, tag, config);
      if (!validateBranchAndTagResponse.isValid) {
        throw new Error(validateBranchAndTagResponse.message);
      }
      else {
        const validateTagExistsResponse = await validateTagExists(tag);
        if(!validateTagExistsResponse.isValid) {
          throw new Error(validateTagExistsResponse.message);
        }
      }
    }
    if(!isPulled) {
      await pullLatest();
    }
    
    if(force) {
      await createVersion(tag, force); // Force version creation without confirmation
    }
    else {
      const createVersionInput = await confirm({message: `Create version: ${tag} ?`});
      if (createVersionInput) {
        await createVersion(tag, force);
      } else {
        echo(chalk.yellowBright("Version not pushed"));
        process.exit(0);
      }
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

export default set;