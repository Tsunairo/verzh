#!/usr/bin/env zx

import { chalk, echo, fs } from 'zx';
import { Question, VersionConfig } from '../utils/types';
import { validateTagExists, validateGit, validateTagStructure, validatePreReleaseName, validateProjectName } from '../utils/validators';
import { fetchGitBranches, fetchGitRemotes} from '../utils/helpers';
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
    const response = (await input({message: 'Enter a project name', default: currentFolder})).trim();
    const validateProjectNameResponse = validateProjectName(response);
    if(!validateProjectNameResponse.isValid){
      throw Error(validateProjectNameResponse.message);
    }
    return response;
  }
};

const currentVersionQuestion: Question = {
  name: 'current',
  prompt: async () => {
    const response = (await input({message: 'Enter current version'})).trim();
    const validationResponse = await validateTagStructure(response);
    if(!validationResponse.isValid) {
      throw new Error(validationResponse.message);
    }
    return response;
  }
};

const releaseBranchQuestion: Question = {
  name: 'releaseBranch',
  prompt: async () => {
    const response = await search({message: 'Select release branch', source: (async term => {
      const branches = await fetchGitBranches();
  
      return branches.filter(branch => branch.includes(term ?? '')).map(branch => ({
        name: branch,
        value: branch
      }));
    })});
    return response;
  }
};

const preReleaseBranchesQuestion: Question = {
  name: 'preReleaseBranches',
  prompt: async(): Promise<Record<string, string>> => {
    const preReleaseConfirm = await confirm({message: "Create pre-releases"});
    let preReleases = {};
    if(preReleaseConfirm) {
      const branches = (await fetchGitBranches()).filter(branch => branch !== config.releaseBranch && !Object.keys(config.preReleaseBranches).includes(branch));
      do {
        const preReleaseBranch =  await search({message: "Select a branch", source: async (term) => {
          const availableBranches = branches.filter(branch => !Object.keys(preReleases).includes(branch) && branch.includes(term ?? ''));
          return ['<Exit>', ...availableBranches].map(branch => ({
            name: branch,
            value: branch
          }));
        }});
        if(preReleaseBranch === '<Exit>') {
          break;
        }
        let preReleaseName =  (await input({message: "Enter pre-release name"})).trim();

        const validatePreReleaseNameResponse = validatePreReleaseName(preReleaseName, Object.values(preReleases));
        if (!validatePreReleaseNameResponse.isValid) {
          echo(chalk.redBright(validatePreReleaseNameResponse.message));
          continue;
        }
        preReleases = {...preReleases, [preReleaseBranch + '']: preReleaseName};
        const confirmResponse = await confirm({message: "Add another pre-release branch?"});
        if(!confirmResponse) {
          break;
        }
      }
      while(branches.length > 0);
    }
    return preReleases;
  }
};

const remoteQuestion: Question = {
  name: 'remote',
  prompt: async () => {
    const remotes = await fetchGitRemotes();
    const response = await search({message: "Select remote", source: (async (term = '') => {
      return remotes.filter(remote => !remote.includes(term)).map(branch => ({
        name: branch,
        value: branch
      }));
    })});
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
    const response = await confirm({message: "Auo push to remote"});

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
    const response = await confirm({message: "Update version in package.json?"});

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
  if (fs.existsSync('verzh.config.json')) {
    const overwrite = await confirm({message: 'Configuration exists. Overwrite?'});
    if (!overwrite) {
      echo(chalk.yellow('Initialization aborted.'));
      process.exit(0);
    }
  }
  else if(!await validateGit()) {
    echo(chalk.redBright('This command must be run in a git repository.'));
    process.exit(1);
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
      catch(error: any) {
        echo(chalk.redBright(error?.message));
        continue;
      }
    } while (true);
  }

  fs.writeFileSync('verzh.config.json', JSON.stringify(config, null, 2));
  echo(chalk.greenBright('Version configuration initialized successfully.'));

  const tagExists = await validateTagExists(config.current);
  if(!tagExists) {
    const setTagPrompt = await confirm({message: `Noticed version ${config.current} does not exist. Create it?`});
    if(setTagPrompt) {
      await set(config.current, false, true, true);
    }
  }
  else {
    process.exit(0);
  }
};

export default init;