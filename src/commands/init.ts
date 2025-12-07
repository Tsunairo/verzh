#!/usr/bin/env zx

import { chalk, echo, fs } from 'zx';
import { Question, VersionConfig } from '../utils/types';
import { validateTagExists, validateGit, validateTagStructure, validatePreReleaseName, validateProjectName, validateChangesCommitted } from '../utils/validators';
import { fetchGitBranches, fetchGitRemotes, handleError } from '../utils/helpers';
import set from './set';
import { input, search, confirm } from '@inquirer/prompts';
import path from 'path';

const config: VersionConfig = {
  name: '',
  current: '1.0.0',
  precededBy: '',
  releaseBranch: '',
  preReleaseBranches: {},
  autoPushToRemote: false,
  updatePackageJson: false,
  remote: ''
};

const projectNameQuestion: Question = {
  name: 'name',
  prompt: async () => {
    const currentFolder = path.basename(path.resolve());
    const response = (await input({ message: 'Enter a project name', default: currentFolder })).trim();
    const validateProjectNameResponse = validateProjectName(response);
    if (!validateProjectNameResponse.isValid) {
      throw Error(validateProjectNameResponse.message);
    }
    return response;
  }
};

const currentVersionQuestion: Question = {
  name: 'current',
  prompt: async () => {
    const response = (await input({ message: 'Enter current version', default: '1.0.0' })).trim();
    const validationResponse = await validateTagStructure(response);
    if (!validationResponse.isValid) {
      throw new Error(validationResponse.message);
    }
    return response;
  }
};

const releaseBranchQuestion: Question = {
  name: 'releaseBranch',
  prompt: async () => {
    const response = await search({
      message: 'Select release branch', source: (async term => {
        const branches = await fetchGitBranches();

        return branches.filter(branch => branch.includes(term ?? '')).map(branch => ({
          name: branch,
          value: branch
        }));
      })
    });
    return response;
  }
};

const preReleaseBranchesQuestion: Question = {
  name: 'preReleaseBranches',
  prompt: async (): Promise<Record<string, string>> => {
    const preReleaseConfirm = await confirm({ message: "Create pre-releases" });
    let preReleases = {};
    if (preReleaseConfirm) {
      const branches = (await fetchGitBranches()).filter(branch => branch !== config.releaseBranch && !Object.keys(config.preReleaseBranches).includes(branch));
      do {
        const preReleaseBranch = await search({
          message: "Select a branch", source: async (term) => {
            const availableBranches = branches.filter(branch => !Object.keys(preReleases).includes(branch) && branch.includes(term ?? ''));
            return ['<Exit>', ...availableBranches].map(branch => ({
              name: branch,
              value: branch
            }));
          }
        });
        if (preReleaseBranch === '<Exit>') {
          break;
        }
        let preReleaseName = (await input({ message: "Enter pre-release name" })).trim();

        const validatePreReleaseNameResponse = validatePreReleaseName(preReleaseName, Object.values(preReleases));
        if (!validatePreReleaseNameResponse.isValid) {
          echo(chalk.redBright(validatePreReleaseNameResponse.message));
          continue;
        }
        preReleases = { ...preReleases, [preReleaseBranch + '']: preReleaseName };
        const confirmResponse = await confirm({ message: "Add another pre-release branch?" });
        if (!confirmResponse) {
          break;
        }
      }
      while (branches.length > 0);
    }
    return preReleases;
  }
};

const remoteQuestion: Question = {
  name: 'remote',
  prompt: async () => {
    const remotes = await fetchGitRemotes();
    const response = await search({
      message: "Select remote", source: (async (term = '') => {
        return remotes.filter(remote => remote.includes(term)).map(branch => ({
          name: branch,
          value: branch
        }));
      })
    });
    return response;
  },
  preCondition: async () => {
    const remotes = await fetchGitRemotes();
    return remotes.length > 0;
  }
};

const autoPushToRemoteQuestion: Question = {
  name: 'autoPushToRemote',
  prompt: async () => {
    const response = await confirm({ message: "Auo push to remote" });

    return response;
  },
  preCondition: async () => {
    const isGitRepositoryResponse = await validateGit();
    return isGitRepositoryResponse.isValid;
  }
};

const updatePackageJsonQuestion: Question = {
  name: 'updatePackageJson',
  prompt: async () => {
    const response = await confirm({ message: "Update version in package.json?" });

    return response;
  },
  preCondition: async () => {
    const isPackageJsonExists = fs.existsSync('package.json');
    return isPackageJsonExists;
  }
};

const questions: Question[] = [
  projectNameQuestion,
  currentVersionQuestion,
  releaseBranchQuestion,
  preReleaseBranchesQuestion,
  remoteQuestion,
  autoPushToRemoteQuestion,
  updatePackageJsonQuestion
];

const init = async () => {
  try {
    if (fs.existsSync('verzh.config.json')) {
      const overwrite = await confirm({ message: 'Configuration exists. Overwrite?' });
      if (!overwrite) {
        throw new Error('Initialization aborted.');
      }
    }
    const { message: isGitRepositoryMessage, isValid: isGitRepository } = await validateGit();
    if (!isGitRepository) {
      throw new Error(isGitRepositoryMessage);
    }
    const { message: changesCommittedMessage, isValid: changesCommitted }= await validateChangesCommitted();
    if (!changesCommitted) {
      throw new Error(changesCommittedMessage);
    }
    for (const q of questions) {
      if (q.preCondition && !(await q.preCondition())) {
        // echo(chalk.yellow(`Skipping question: ${q.message}`));
        continue;
      }
      do {
        try {
          const response = await q.prompt();
          // config[q.name] = response;
          (config as any)[q.name] = response; // TODO: Create a proper type-safe solution
          break;
        }
        catch (error: any) {
          echo(chalk.redBright(error?.message));
          continue;
        }
      } while (true);
    }
    fs.writeFileSync('verzh.config.json', JSON.stringify(config, null, 2));
    echo(chalk.greenBright('Version configuration initialized successfully.'));
    const { isValid: tagExists } = await validateTagExists(config.current);
    if (!tagExists) {
      echo(chalk.greenBright(`Creating version ${config.current}`));
      await set(config.current, true, true);
    }
    process.exit(0);
  }
  catch (error) {
    handleError(error as Error, "Initializing");
    process.exit(1);

  }
};

export default init;