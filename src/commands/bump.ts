#!/usr/bin/env zx

import { $ } from 'zx';
import { VersionConfig } from '../utils/types';
import { validateCommandBranch, validateBumpType } from '../utils/validators';
import { handleError, pullLatest } from '../utils/helpers';
import set from './set';
import { select } from '@inquirer/prompts';
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
  try {
    config = await getConfig();

    let branch: string = (await $`git rev-parse --abbrev-ref HEAD`).stdout.trim();
    const validateBranchResponse = await validateCommandBranch(branch, config);
    if (validateBranchResponse.isValid) {
      if(!type) {
        if(config.preReleaseBranches[branch]) {
          type = "PRE_RELEASE";
        }
        else {
          type = 'PATCH';
          // type = await select({message: 'Select a bump type', choices: [{name: 'major', value: 'MAJOR'}, {name: 'minor', value: 'MINOR'}, {name: 'patch', value: 'PATCH'}]})
        }
      }
      else {
        const validateBumpTypeResponse = validateBumpType(type, branch, config);
        if(!validateBumpTypeResponse.isValid) {
          throw new Error(validateBumpTypeResponse.message);
        }
        else {
          type = type.toUpperCase();
        }
      }
    }
    else {
      throw new Error(validateBranchResponse.message);
    }
    await pullLatest();

    const newTag = createNewTag(branch, type);
    
    await set(newTag, force, true, true, true);
  }
  catch(error) {
    handleError(error as Error, 'Bumping Version');
  }
  finally {
    process.exit(0);
  }
};

export default bump;
