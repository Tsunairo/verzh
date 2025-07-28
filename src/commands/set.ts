#!/usr/bin/env zx

import { chalk, echo, spinner, fs, $ } from 'zx';
import { VersionConfig } from '../utils/types';
import { validateTagExists, validateBranchAndTag, validateBumpBranchAndType } from '../utils/validators';
import { handleError, hasUncommittedChanges, loadConfig, prompt, pullLatest } from '../utils/helpers';
import push from './push';

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

const getType = (branch: string, providedType?: string) => {
  if(!providedType === (config.releaseBranch === branch || config.preReleaseBranches[branch])) {
    providedType = config.preReleaseBranches[branch] ? "PRE_RELEASE" : "PATCH";
  }
  else {
    handleError(new Error(`Type is required. Please specify a type.`), "Type Validation");
    process.exit(1);
  }
  const validateBranchResponse = validateBumpBranchAndType(branch, providedType, config);
  if (!validateBranchResponse.isValid) {
    handleError(new Error(validateBranchResponse.message), "Branch & Type Validation");
    process.exit(1);
  }

  return providedType;
};

const createVersion = async (tag: string, force?: boolean): Promise<void> => {
  if(!force) {
    if (await hasUncommittedChanges()) {
      const proceed = await prompt(
        chalk.yellow('\nThere are uncommitted changes in your working directory. Proceed anyway? '), 'confirm'
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
  await push(tag, force);
};

const set = async (tag: string, force?: boolean, isBranchAndTagValidated?: boolean, isPulled?: boolean): Promise<void> => {
  config = await loadConfig(configPath);
  try {
    let branch: string = (await $`git rev-parse --abbrev-ref HEAD`).stdout.trim();
    if(!isBranchAndTagValidated) {
      const validateBranchAndTagResponse = await validateBranchAndTag(branch, tag, config);
      if (!validateBranchAndTagResponse.isValid) {
        handleError(new Error(validateBranchAndTagResponse.message), "Branch and Tag Validation");
        process.exit(1);
      }
      else {
        const tagExists = await validateTagExists(tag);
        if(tagExists) {
          handleError(new Error("Tag already exists"), "Tag Validation");
          process.exit(1);
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
      const createVersionInput = await prompt(`\nCreate version: ${tag} ?`, 'confirm');
      if (createVersionInput) {
        await createVersion(tag, force);
      } else {
        echo(chalk.redBright("Version not pushed"));
        process.exit(0);
      }
    }
  }
  catch(error) {
    handleError(error as Error, 'Bumping Version');
  }
  finally {
    process.exit(0);
  }
};

export default set;