#!/usr/bin/env zx

import { chalk, echo, question, spinner, fs, argv, $ } from 'zx';
import { PromptChoices, PromptSource, PromptType, VersionConfig } from '../utils/types';
import { doesTagExist, isGitRepository, validateTag, validateInitBranch, validateInitPreReleaseName, validateRemote } from '../utils/validators';
import { fetchGitBranches, fetchGitRemotes, prompt, pullLatest } from '../utils/helpers';
import set from './set';


type Question<T> = {
  name: string;
  message: string;
  type: PromptType | 'custom';
  choices?: PromptChoices;
  source?: PromptSource;
  required: boolean;
  default?: any;
  preCondition?: () => boolean | Promise<boolean>;
  answer: (input: T) => T;
  validate?: (answer: T) => Promise<Boolean> | boolean;
}

const config: VersionConfig = {
  current: '1.0.0',
  precededBy: '',
  releaseBranch: '',
  preReleaseBranches: {},
  autoPushToRemote: false,
  updatePackageJson: false,
  remote: '',
};

const preReleasesPrompt = async (): Promise<Map<string, string>> => {
  const preReleaseConfirm = await prompt("Create pre-releases?", 'confirm');
  let preReleases: Map<string, string> = new Map();
  if(preReleaseConfirm) {
    const branches = (await fetchGitBranches()).filter(branch => branch !== config.releaseBranch && !Object.keys(config.preReleaseBranches).includes(branch));
    do {
      const preReleaseBranch =  await prompt("Select a branch", 'search', undefined, async (input) => {
        input = typeof input === 'string' ? input.trim() : '';
        const availableBranches = branches.filter(branch => !Object.keys(preReleases).includes(branch) && branch.includes(input));
        return ['<Exit>', ...availableBranches].map(branch => ({
          name: branch,
          value: branch
        }));
      });
      if(preReleaseBranch === '<Exit>') {
        break;
      }
      let preReleaseName =  await prompt("Enter pre-release name", 'input');
      preReleaseName = typeof preReleaseName === 'string' ? preReleaseName.trim() : '';

      const validatePreReleaseNameResponse = validateInitPreReleaseName(preReleaseName, Object.values(preReleases));
      if (!validatePreReleaseNameResponse.isValid) {
        echo(chalk.redBright(validatePreReleaseNameResponse.message));
        continue;
      }
      preReleases = {...preReleases, [preReleaseBranch + '']: preReleaseName};
      const confirmResponse = await prompt("Add another pre-release branch?", 'confirm');
      if(!confirmResponse) {
        break;
      }
    }
    while(branches.length > 0);
  }
  return preReleases;
}

const projectNameQuestion: Question<string> = {
  name: 'name',
  message: 'Project name:',
  default: 'my-project',
  type: 'input',
  required: true,
  answer: (input) => input.trim(),
  validate: (answer) => {
    if (!answer) {
      console.log(chalk.redBright('Project name cannot be empty.'));
      return false;
    }
    else {
      if (!/^[a-zA-Z0-9._-]+$/.test(answer)) {
        console.log(chalk.redBright('Project name can only contain alphanumeric characters, dots, underscores, and hyphens.'));
        return false;
      }
    }
    return true;
  }
};

const currentVersionQuestion: Question<string> = {
  name: 'current',
  message: 'Current version (e.g., 1.0.0):',
  default: '1.0.0',
  type: 'input',
  required: true,
  answer: (input) => input.trim(),
  validate: async (answer) => {
    const validationResponse = await validateTag(answer);
    if(!validationResponse.isValid) {
      echo(chalk.redBright(validationResponse.message));
      return false;
    }
    return true;
  },
};

const releaseBranchQuestion: Question<string> = {
  name: 'releaseBranch',
  message: 'Release branch (e.g., main):',
  required: true,
  type: 'search',
  source: async (input) => {
    const branches = await fetchGitBranches();

    return branches.map(branch => ({
      name: branch,
      value: branch
    }));
  },
  default: 'current',
  answer: (input) => input.trim(),
  validate: async (answer) => {
    const validateBranchResponse = await validateInitBranch(answer);
    if (!validateBranchResponse.isValid) {
      echo(chalk.redBright(validateBranchResponse.message));
      return false;
    }
    return true;
  },
};

const preReleaseBranchesQuestion: Question<Map<string, string>> = {
  name: 'preReleaseBranches',
  message: 'Pre-release branches - comma-separated, e.g., development:dev,staging:staging',
  default: {},
  type: 'custom',
  required: false,
  answer: (input) => {
    return input;
  },
  validate: async (answer) => {
    // answer = typeof answer === 'string' ? answer.trim() : '';
    // const branchAndPrNames = answer.split(',').map(b => b.trim());
    // for (const branch of branchAndPrNames) {
    //   if (!branch.includes(':')) {
    //     return `Invalid format for branch: ${branch}. Use branch:release-name format.`;
    //   }

    //   const [branchName, releaseName] = branch.split(':');
    //   const validateBranchResponse = await validateInitBranch(branchName.trim());
    //   const validatePreReleaseNameResponse = validateInitPreReleaseName(
    //     releaseName.trim(),
    //     branchAndPrNames.map(b => b.split(':')[1].trim())
    //   );

    //   if (!validateBranchResponse.isValid) {
    //     echo(chalk.redBright(validateBranchResponse.message));
    //     return false;
    //   }
    //   if (!validatePreReleaseNameResponse.isValid) {
    //     echo(chalk.redBright(validatePreReleaseNameResponse.message));
    //     return false;
    //   }
    // }
    return true;
  }
};

const remoteQuestion: Question<string> = {
  name: 'remote',
  message: 'Remote (e.g., origin):',
  required: true,
  type: 'search',
  source: async (input) => {
    const remotes = await fetchGitRemotes();
    input = typeof input === 'string' ? input.trim() : '';

    return remotes.filter(remote => remote.includes(input)).map(branch => ({
      name: branch,
      value: branch
    }));
  },
  preCondition: async () => {
    const remotes = await fetchGitRemotes();
    return remotes.length > 0;
  },
  answer: (input) => input.trim(),
  validate: async (answer) => {
    const validateRemoteResponse = await validateRemote(answer);
    if (!validateRemoteResponse.isValid) {
      echo(chalk.redBright(validateRemoteResponse.message));
      return false;
    }
    return true;
  },
};

const autoPushToRemoteQuestion: Question<boolean> = {
  name: 'autoPushToRemote',
  message: 'Auto push to remote?',
  required: true, 
  preCondition: async () => {
    const isGitRepositoryResponse = await isGitRepository();
    return isGitRepositoryResponse.isValid;
  },
  type: 'confirm',
  default: false,
  answer: (input) => input
};
const updatePackageJsonQuestion: Question<boolean> = {
  name: 'updatePackageJson',
  message: 'Update version in package.json?',
  required: true, 
  preCondition: async () => {
    const isPackageJsonExists = fs.existsSync('package.json');
    return isPackageJsonExists;
  },
  type: 'confirm',
  default: false,
  answer: (input) => input
};

const questions: Question<any>[] = [
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
    const overwrite = await prompt('Configuration exists. Overwrite?', 'confirm');
    if (!overwrite) {
      echo(chalk.yellow('Initialization aborted.'));
      process.exit(0);
    }
  }
  else if(!await isGitRepository()) {
    echo(chalk.redBright('This command must be run in a git repository.'));
    process.exit(1);
  }

  for (const q of questions) {
    if (q.preCondition && !(await q.preCondition())) {
      // echo(chalk.yellow(`Skipping question: ${q.message}`));
      continue;
    }
    let answer;
    do {
      const response = q.type === 'custom' ? await preReleasesPrompt() : await prompt(q.message, q.type, q.choices, q.source);
      if(!response && !q.required) {
        answer = q.default;
      }
      else if (q.validate) {
        const validationResult = await q.validate(response);
        if (validationResult !== true) {
          echo(chalk.redBright(validationResult));
          continue;
        }
        else {
          answer = q.answer(response);
        }
      }
      else {
        answer = q.answer(response);
      }
      break;
    } while (true);
    (config as any)[q.name] = answer; // TODO: Create a proper type-safe solution
  }

  fs.writeFileSync('verzh.config.json', JSON.stringify(config, null, 2));
  echo(chalk.greenBright('Version configuration initialized successfully.'));

  const tagExists = await doesTagExist(config.current);
  if(!tagExists) {
    const setTagPrompt = await prompt(`Noticed version ${config.current} does not exist. Create it?`, 'confirm');
    if(setTagPrompt) {
      await set(config.current, false, true, true);
    }
  }
  else {
    process.exit(0);
  }
};

export default init;