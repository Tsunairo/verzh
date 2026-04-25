import { $ } from 'zx';
import { VersionConfig, VersionType } from '../utils/types';
import { validateCommandBranch, validateBumpType, validateChangesCommitted } from '../utils/validators';
import { handleError, performPreScripts, pullLatest } from '../utils/helpers';
import set from './set';
import { confirm, select } from '@inquirer/prompts';
import getConfig from './getConfig';


$.quiet = true;

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

const createNewTag = (branch: string, type: VersionType) => {
  let currentTag = config.current.split("-")[0] ?? "1.0.0";
  let [major, minor, patch] = currentTag.split(".").map(Number);

  let preRelease: string | undefined;
  let preReleaseName: string | undefined;
  let preReleaseNum: number | undefined;
  
  if (type === "MAJOR") {
    major++;
    minor = 0;
    patch = 0;
  }
  else if (type === "MINOR") {
    minor++;
    patch = 0;
  }
  else if (type === "PATCH") {
    patch++;
  }
  else {
    preReleaseName = config.preReleaseBranches[branch];
    if(config.current.includes(`-${preReleaseName}.`)){
      preReleaseNum = Number(config.current.split(`-${preReleaseName}.`)[1].split(".")[0]) + 1;
    }
    else {
      preReleaseNum = 1;
    }
    preRelease = `${preReleaseName}.${preReleaseNum}`;
  }
  
  const newTag = `${major}.${minor}.${patch}${preRelease ? "-" + preRelease : ""}`;  
  return newTag;
};

const bump = async (type?: VersionType, force?: boolean): Promise<void> => {
  try {
    config = await getConfig();

    if (!force) {
      if (config.preScript) {
        await performPreScripts(config);
      }
      const { message: changesCommittedMessage, isValid: changesCommitted } = await validateChangesCommitted();
      const continueResponse = await confirm({ message: "There are uncommitted changes. Continue?" });
      if (!continueResponse) {
        throw new Error(changesCommittedMessage);
      }
    }
    let branch: string = (await $`git rev-parse --abbrev-ref HEAD`).stdout.trim();
    const validateBranchResponse = await validateCommandBranch(branch, config);
    if (validateBranchResponse.isValid) {
      if (!type) {
        if (config.preReleaseBranches[branch]) {
          type = "PRE-RELEASE";
        }
        else {
          if (config.releaseBranch === branch) {
            type = "PATCH";
          }
          else if (!force) {
            type = await select({ message: 'Select a bump type', choices: [{ name: 'major', value: 'MAJOR' }, { name: 'minor', value: 'MINOR' }, { name: 'patch', value: 'PATCH' }] })
          }
          else {
            throw new Error('Bump type is required when using --force');
          }
        }
      }
      else {
        const validateBumpTypeResponse = validateBumpType(type, branch, config);
        if (!validateBumpTypeResponse.isValid) {
          throw new Error(validateBumpTypeResponse.message);
        }
      }
    }
    else {
      throw new Error(validateBranchResponse.message);
    }
    if(config.remote !== ''){
      await pullLatest();
    }

    const newTag = createNewTag(branch, type);

    await set(newTag, force, true);
  }
  catch (error) {
    handleError(error as Error, 'Bumping Version');
  }
  finally {
    process.exit(0);
  }
};

export default bump;
