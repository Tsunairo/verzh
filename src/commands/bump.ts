#!/usr/bin/env zx

import { spinner, $ } from 'zx';
import { VersionConfig } from '../utils/types';
import { validateBumpBranchAndType, validateConfig, validateVersion } from '../utils/validators';
import { handleError, hasUncommittedChanges, loadConfig, prompt } from '../utils/helpers';
import set from './set';

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

const createNewTag = (branch: string, type: string) => {
  let currentTag = config.current.split("-")[0] ?? "1.0.0";
  let [major, minor, patch] = currentTag.split(".").map(Number);

  let preRelease: string | undefined;
  let preReleaseName: string | undefined;
  let preReleaseNum: number | undefined;

  if (branch !== config.releaseBranch) {
    preRelease = config.current.split("-").filter((_, index) => index > 0).join("-") || branch.split("/").join(".") + ".0";
    preReleaseName = preRelease.split(".").filter((_, index, array) => index < array.length - 1).join(".");
    preReleaseNum = Number(preRelease.split(".")[preRelease.split(".").length - 1]);
  }

  if(branch === config.releaseBranch) {
    if(type === "MAJOR") {
      major++;
      minor = 0;
      patch = 0;
    }
    else if(type === "MINOR") {
      minor++;
      patch = 0;
    }
    else if(type === "PATCH") {
      patch++;
    }
  }
  else {
    if (preRelease) {
      preReleaseNum = (preReleaseNum ?? 0) + 1;
      preRelease = `${preReleaseName}.${preReleaseNum}`;
    } else {
      if (branch !== config.releaseBranch) {
        preReleaseNum = 1;
        preReleaseName = branch.split("/").join(".");
        preRelease = `${preReleaseName}.${preReleaseNum}`;
      }
    }
  }
  
  const newTag = `${major}.${minor}.${patch}${preRelease ? "-" + preRelease : ""}`;
  return newTag;
};

const bump = async (type?: string, force?: boolean): Promise<void> => {
  config = await loadConfig(configPath);
  
  try {
    let branch: string = (await $`git rev-parse --abbrev-ref HEAD`).stdout.trim();
    if(!type && (config.releaseBranch === branch || config.preReleaseBranches[branch])) {
      type = config.preReleaseBranches[branch] ? "PRE_RELEASE" : "PATCH";
    }
    else {
      handleError(new Error(`Bump type is required. Please specify a type.`), "Bump Type Validation");
      process.exit(1);
    }
    const validateBranchResponse = validateBumpBranchAndType(branch, type, config);
    if (!validateBranchResponse.isValid) {
      handleError(new Error(validateBranchResponse.message), "Bump Branch & Type Validation");
      process.exit(1);
    }
    await spinner('Pulling...', async () => {
      try {
        await $`git pull`;
      }
      catch (error) {
        handleError(error as Error, "Pulling Changes");
        process.exit(1);
      }
    });
    
    const validateVersionResponse = validateVersion(config.current);
    if (!validateVersionResponse.isValid) {
      handleError(new Error(validateVersionResponse.message), "Version Validation");
      process.exit(1);
    }
    const newTag = createNewTag(branch, type);
    
    await set(newTag, force, true, true);
  }
  catch(error) {
    handleError(error as Error, 'Bumping Version');
  }
  finally {
    process.exit(0);
  }
};

export default bump;
