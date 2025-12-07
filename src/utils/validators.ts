#!/usr/bin/env zx

import { $ } from 'zx';
import { ValidationResponse, VersionConfig } from './types';

export const validateTagExists = async (tag: string): Promise<ValidationResponse> => {
  try {
    await $`git rev-parse refs/tags/${tag}`;
    return {
      isValid: true
    };
  } catch {
    return {
      isValid: false,
      message: `Tag ${tag} does not exist`
    };
  }
};

export const validateTagStructure = async (tag: string): Promise<ValidationResponse> => {
  if(tag) {
    const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    if (!semverRegex.test(tag)) {
      return {
        isValid: false,
        message: 'Tag is not a valid format. Valid formats include 1.0.2 or 1.0.2-beta.3'
      };
    }
  }
  else {
    return {
      isValid: false,
      message: 'Tag not defined'
    };
  }
  return {
    isValid: true
  };
};

export const validateProjectName = (projectName: string): ValidationResponse => {
  if (!/^[a-zA-Z0-9._-]+$/.test(projectName)) {
    return {
      message: 'Project name can only contain alphanumeric characters, dots, underscores, and hyphens.',
      isValid: false
    };
  }
  return {
    isValid: true
  };
};

export const validatePreReleases = async (preReleases: Record<string, string>): Promise<ValidationResponse[]> => {
  let validationResponses:ValidationResponse[] = [];
  const preReleaseBranches = Object.keys(preReleases);
  const preReleaseNames = Object.values(preReleases);

  await Promise.all(Object.entries(preReleases).map(async ([preReleaseBranch, preReleaseName]) => {
    const validateBranchResponse = await validatePreReleaseBranch(preReleaseBranch, preReleaseBranches.filter(prb => prb !== preReleaseName));
    const validatePreReleaseNameResponse = validatePreReleaseName(preReleaseName, preReleaseNames.filter(prn => prn !== preReleaseName));
  
    validationResponses = [...validationResponses, validateBranchResponse, validatePreReleaseNameResponse];
  }));

  return validationResponses.filter(vr => !vr.isValid);
};

export const validatePreReleaseName = (name: string, otherNames: string[]): ValidationResponse => {
  if (!name) {
    return {
      isValid: false,
      message: 'Pre-release name cannot be empty.'
    };
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    return {
      isValid: false,
      message: `Pre-release name "${name}" can only contain alphanumeric characters, dots, underscores, and hyphens.`
    };
  }
  if(otherNames.includes(name)) {
    return {
      isValid: false,
      message: `Pre-release name "${name}" already defined elswhere.`
    };
  }
  return {
    isValid: true
  };
};

export const validatePreReleaseBranch = async (branch: string, otherBranches: string[]): Promise<ValidationResponse> => {
  const validateBranchResponse = await validateBranchExists(branch);
  if(validateBranchResponse.isValid) {
    if(otherBranches.includes(branch)) {
      return {
        isValid: false,
        message: `Pre-release branch "${branch}" already defined elswhere.`
      };
    }
    return {
      isValid: true
    };
  }
  else {
    return validateBranchResponse;
  }
};

export const validateBranchExists = async (branch: string): Promise<ValidationResponse> => {
  const { stdout } = await $`git branch --list ${branch}`;

  if (stdout.trim()) {
    return {
      isValid: true
    };
  } else {
    return {
      isValid: false,
      message: `Branch ${branch} does not exist`
    };
  }
};

export const validateCommandBranch = async (branch: string, config: VersionConfig): Promise<ValidationResponse> => {
  const validateBranchResponse = await validateBranchExists(branch);
  if(validateBranchResponse.isValid) {
    const releaseBranch = config.releaseBranch;
    const preReleaseBranches = Object.keys(config.preReleaseBranches);
    const validBranches = [releaseBranch, ...preReleaseBranches];
    
    if(!validBranches.includes(branch)) {
      if(branch !== releaseBranch) {
        return {
          isValid: false,
          message: `Branch ${branch} is not valid for this command. Valid branch is: ${releaseBranch}`
        };
      }
      else if(!preReleaseBranches.includes(branch)) {
        return {
          isValid: false,
          message: `Branch ${branch} is not valid for this command. Valid branches are: [${preReleaseBranches.join(", ")}]`
        };
      }
      return {
        isValid: false,
        message: `Branch ${branch} is not valid for this command. Valid branches are: [${validBranches.join(", ")}]`
      };
    }
    return {
      isValid: true
    };
  }
  else {
    return validateBranchResponse;
  }
};

export const validateBranchAndTag = async (branch: string, tag: string, config: VersionConfig): Promise<ValidationResponse> => {
  const validateBranchResponse = await validateCommandBranch(branch, config);
  if(validateBranchResponse.isValid) {
    const validateTagResponse= await validateTagStructure(tag);
    if(validateTagResponse.isValid) {
      const tagSections = tag.split("-");
      if(tagSections.length === 1 && config.preReleaseBranches[branch]) {
        return {
          isValid: false,
          message: 'Tag cannot be used in pre-release branch'
        }
      }
      else if(tagSections.length > 1 && config.releaseBranch) {
        return {
          isValid: false,
          message: 'Tag cannot be used in release branch'
        }
      }
      return {
        isValid: true
      };
    }
    return validateTagResponse;
  }
  else {
    return validateBranchResponse;
  }
}

export const validateBumpBranchAndType = async (branch: string, type: string, verConfig: VersionConfig): Promise<ValidationResponse> => {
  const validateBranchResponse = await validateCommandBranch(branch, verConfig);
  if(!validateBranchResponse.isValid) {
    return validateBranchResponse;
  }
  else {
    if (!['MAJOR', 'MINOR', 'PATCH', 'PRE-RELEASE'].includes(type)) {
      return {
        isValid: false,
        message: `Invalid bump type: ${type}. Must be one of MAJOR, MINOR, PATCH, PRE-RELEASE.`
      };
    }
    if(branch === verConfig.releaseBranch && type === "PRE-RELEASE") {
      return {
        isValid: false,
        message: "Pre-release type cannot be used in the release branch."
      };
    }
    if (type === "PRE-RELEASE" && !verConfig.preReleaseBranches[branch]) {
      return {
        isValid: false,
        message: `Branch ${branch} is not a valid pre-release branch. Valid branches are: ${Object.keys(verConfig.preReleaseBranches).join(', ')}`
      };
    }
  }

  return {
    isValid: true
  }
};

export const validateAutoPushToRemote = (autoPushToRemote: boolean): ValidationResponse => {
  if(typeof autoPushToRemote !== 'boolean') {
    return {
      isValid: false,
      message: "autoPushToRemote can only be true or false"
    };
  }
  return {
    isValid: true
  };
};

export const validateUpdatePackageJson = (updatePackageJson: boolean): ValidationResponse => {
  if(typeof updatePackageJson !== 'boolean') {
    return {
      isValid: false,
      message: "updatePackageJson can only be true or false"
    };
  }
  return {
    isValid: true
  };
};

export const validateBumpType = (type: string, branch: string, verConfig: VersionConfig): ValidationResponse => {
  if (!['MAJOR', 'MINOR', 'PATCH', 'PRE-RELEASE'].includes(type)) {
    return {
      isValid: false,
      message: `Invalid type: ${type}. Must be one of MAJOR, MINOR, PATCH, PRE-RELEASE.`
    };
  }
  if(branch === verConfig.releaseBranch && type === "PRE-RELEASE") {
    return {
      isValid: false,
      message: "Pre-release type cannot be used in the release branch."
    };
  }
  if (type === "PRE-RELEASE" && !verConfig.preReleaseBranches[branch]) {
    return {
      isValid: false,
      message: `Branch ${branch} is not a valid pre-release branch. Valid branches are: ${Object.keys(verConfig.preReleaseBranches).join(', ')}`
    };
  }
  return {
    isValid: true
  };
};

export const validateConfig = async (config: VersionConfig): Promise<ValidationResponse[]> => {
  const requiredFields = ['name', 'current', 'precededBy', 'releaseBranch', 'preReleaseBranches', 'autoPushToRemote', 'updatePackageJson', 'remote'] as const;
  const missingFields: string[] = [];
  for (const field of requiredFields) {
    if (!Object.keys(config).includes(field)) {
      missingFields.push(field);
    }
  }
  if(missingFields.length > 0) {
    return [{
      isValid: false,
      message: `Missing required fields in version config: ${missingFields.join(', ')}`
    }];
  }
  else {
    let invalidResponses = (await Promise.all([
      validateProjectName(config.name),
      validateTagStructure(config.current),// check
      validateTagStructure(config.precededBy),
      await validateCommandBranch(config.releaseBranch, config),
      validateRemote(config.remote), 
      validateAutoPushToRemote(config.autoPushToRemote),
      validateUpdatePackageJson(config.updatePackageJson),
      ...(await validatePreReleases(config.preReleaseBranches)),
    ])).filter(validationResponse => validationResponse.isValid);

    return invalidResponses.length > 0 ? invalidResponses : [{isValid: true}];
  }
};

export const validateVersion = (version: string): ValidationResponse => {
  const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  const isValid = semverRegex.test(version);
  if (!isValid) {
    return {
      isValid: false,
      message: `Invalid version format: ${version}. Please use semantic versioning (e.g., 1.0.0).`
    };
  }
  return {
    isValid: true
  };
};

export const validateGit = async (): Promise<ValidationResponse> => {
  try {
    await $`git rev-parse --is-inside-work-tree`;
    return {
      isValid: true
    };
  } catch (error) {
    return {
      isValid: false,
      message: 'This is not a git repository.'
    }
  }
};

export const validateRemote = async (remote: string): Promise<ValidationResponse> => {
  try {
    await $`git remote get-url ${remote}`;
    return { isValid: true };
  } catch {
    return { isValid: false, message: `Remote "${remote}" does not exist.` };
  }
};

export const validateChangesCommitted = async (): Promise<ValidationResponse> => {
  let changesCommitted = false;
  try {
    // Check for staged and unstaged changes
    const { stdout: stagedChanges } = await $`git diff --cached --quiet || echo "staged"`;
    const { stdout: unstagedChanges } = await $`git diff --quiet || echo "unstaged"`;
    changesCommitted = (stagedChanges === "staged" || unstagedChanges === "unstaged");
    
  } catch (error) {
    // Git commands might throw if there are changes
    changesCommitted = false;
  }
  if(!changesCommitted) {
    return { isValid: false, message: 'There are changes that have not been committed. Commit or stash them before running this command.' };
  }
  return { isValid: true };
};