import { $ } from 'zx';
import { ValidationResponse, VersionConfig, VersionType } from './types';
import z from 'zod';

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
  if (tag) {
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
  if (z.string().min(1).regex(/^[a-zA-Z0-9._-]+$/).safeParse(projectName).error) {
    return {
      isValid: false,
      message: z.string().min(1).regex(/^[a-zA-Z0-9._-]+$/).safeParse(projectName).error?.message
    };
  }
  return {
    isValid: true
  };
};

export const validatePreScript = (preScript: any): ValidationResponse => {
  if (!preScript) {
    return {
      isValid: true
    };
  }
  if (z.string().min(1).safeParse(preScript).error) {
    return {
      isValid: false,
      message: 'pre scripts must be a string'
    };
  }
  return {
    isValid: true
  };
};

export const validatePreReleases = async (preReleases: Record<string, string>): Promise<ValidationResponse> => {
  return await Promise.all(Object.entries(preReleases).map(async ([preReleaseBranch, preReleaseName]) => {
    const validateBranchResponse = await validatePreReleaseBranch(preReleaseBranch);
    const validatePreReleaseNameResponse = validatePreReleaseName(preReleaseName);

    if(!validateBranchResponse.isValid || !validatePreReleaseNameResponse.isValid) {
      return {
        isValid: false,
        message: `Pre-release branch "${preReleaseBranch}" or name "${preReleaseName}" is not valid`
      };
    }
    return {
      isValid: true
    };
  })).then(results => {
    if(results.every(result => result.isValid)) {
      return {
        isValid: true
      };
    }
    else {
      return {
        isValid: false,
        message: `Pre releases validation failed: ${results.filter(result => !result.isValid).map(result => result.message).join('.\n')}`
      };
    }
  }).catch(error => {
    return {
      isValid: false,
      message: error.message
    };
  });
};

export const validatePreReleaseName = (name: string): ValidationResponse => {
  if (z.string().min(1).regex(/^[a-zA-Z0-9._-]+$/).safeParse(name).error) {
    return {
      isValid: false,
      message: z.string().min(1).regex(/^[a-zA-Z0-9._-]+$/).safeParse(name).error?.message
    };
  }
  return {
    isValid: true
  };
};

export const validatePreReleaseBranch = async (branch: string): Promise<ValidationResponse> => {
  const validateBranchResponse = await validateBranchExists(branch);
  return validateBranchResponse;
};

export const validateBranchExists = async (branch: string): Promise<ValidationResponse> => {
  const { stdout: localBranches } = await $`git branch --list ${branch}`;

  if (localBranches.trim()) {
    return {
      isValid: true
    };
  }

  // Exact remote-tracking name (e.g. origin/main)
  const { stdout: remoteBranches } = await $`git branch -r --list ${branch}`;
  if (remoteBranches.trim()) {
    return {
      isValid: true
    };
  }

  // Bare name that only exists on a remote (e.g. test -> origin/test)
  const { stdout: remoteBranchesByName } = await $`git branch -r --list */${branch}`;
  if (remoteBranchesByName.trim()) {
    return {
      isValid: true
    };
  }

  return {
    isValid: false,
    message: `Branch ${branch} does not exist`
  };
};

export const validateCommandBranch = async (branch: string, config: VersionConfig): Promise<ValidationResponse> => {
  const validateBranchResponse = await validateBranchExists(branch);
  if (validateBranchResponse.isValid) {
    const releaseBranch = config.releaseBranch;
    const preReleaseBranches = Object.keys(config.preReleaseBranches);
    const validBranches = [releaseBranch, ...preReleaseBranches];

    if (!validBranches.includes(branch)) {
      if (branch !== releaseBranch) {
        return {
          isValid: false,
          message: `Branch ${branch} is not valid for this command. Valid branch is: ${releaseBranch}`
        };
      }
      else if (!preReleaseBranches.includes(branch)) {
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
  if (validateBranchResponse.isValid) {
    const validateTagResponse = await validateTagStructure(tag);
    if (validateTagResponse.isValid) {
      const tagSections = tag.split("-");
      if (tagSections.length === 1 && config.preReleaseBranches[branch]) {
        return {
          isValid: false,
          message: 'Tag cannot be used in pre-release branch'
        }
      }
      else if (tagSections.length > 1 && config.releaseBranch) {
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
  if (!validateBranchResponse.isValid) {
    return validateBranchResponse;
  }
  else {
    if (!['MAJOR', 'MINOR', 'PATCH', 'PRE-RELEASE'].includes(type)) {
      return {
        isValid: false,
        message: `Invalid bump type: ${type}. Must be one of MAJOR, MINOR, PATCH, PRE-RELEASE.`
      };
    }
    if (branch === verConfig.releaseBranch && type === "PRE-RELEASE") {
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
  if (typeof autoPushToRemote !== 'boolean') {
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
  if (typeof updatePackageJson !== 'boolean') {
    return {
      isValid: false,
      message: "updatePackageJson can only be true or false"
    };
  }
  return {
    isValid: true
  };
};

export const validateBumpType = (type: VersionType, branch: string, verConfig: VersionConfig): ValidationResponse => {
  if (z.enum(['MAJOR', 'MINOR', 'PATCH', 'PRE-RELEASE']).safeParse(type).error) {
    return {
      isValid: false,
      message: z.enum(['MAJOR', 'MINOR', 'PATCH', 'PRE-RELEASE']).safeParse(type).error?.message
    };
  }
  if (branch === verConfig.releaseBranch && type === "PRE-RELEASE") {
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

export const validateRepositoryHasRemote = async (): Promise<ValidationResponse> => {
  const { stdout } = await $`git remote`;
  if (stdout.trim()) {
    return {
      isValid: true
    };
  }
  return {
    isValid: false,
    message: 'Repository does not have any remote.'
  };
};

export const validateConfig = async (config: VersionConfig): Promise<ValidationResponse> => {
  const configSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    current: z.string().optional(),
    precededBy: z.string().optional(),
    releaseBranch: z.string().min(1, 'Release branch is required'),
    preReleaseBranches: z.record(z.string(), z.string()),
    autoPushToRemote: z.boolean(),
    updatePackageJson: z.boolean(),
    remote: z.string(),
    preScript: z.string().optional()
  });
  const validateConfigResponse = configSchema.safeParse(config);
  
  if (!validateConfigResponse.success) {
    return {
      isValid: false,
      message: validateConfigResponse.error.message
    };
  }

  const validateResponse = await Promise.all([
    validateProjectName(config.name),
    await validateCommandBranch(config.releaseBranch, config),
    validateRemote(config.remote),
    validateAutoPushToRemote(config.autoPushToRemote),
    validateUpdatePackageJson(config.updatePackageJson),
    await validatePreReleases(config.preReleaseBranches),
    validatePreScript(config.preScript),
  ]).then(results => {
    const failed = results.filter(result => !result.isValid);
    if (failed.length === 0) {
      return { isValid: true };
    }
    return {
      isValid: false,
      message: `Validation failed: ${failed.map(result => result.message).join('.\n')}`
    };
  }).catch(error => {
    return {
      isValid: false,
      message: error.message
    };
  });
  
  return validateResponse;
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
  if (!remote) {
    return { isValid: true };
  }
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
    changesCommitted = !(!!stagedChanges || !!unstagedChanges);

  } catch (error) {
    // Git commands might throw if there are changes
    changesCommitted = false;
  }
  if (!changesCommitted) {
    return { isValid: false, message: 'There are changes that have not been committed. Commit or stash them before running this command.' };
  }
  return { isValid: true };
};