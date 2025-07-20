#!/usr/bin/env zx

import { chalk, echo, spinner, fs, $ } from 'zx';
import { VersionConfig } from '../utils/types';
import { validateBumpBranchAndType, validateConfig, validateVersion } from '../utils/validators';
import { handleError, hasUncommittedChanges, prompt } from '../utils/helpers';

$.verbose = false
const verConfigPath = "verzh.config.json";

// Initialize with default values
let verzhConfig: VersionConfig = {
  current: '1.0.0',
  precededBy: '',
  releaseBranch: 'main',
  preReleaseBranches: {},
  autoPushToRemote: false,
  updatePackageJson: false,
  remote: 'origin'
};

const pushVersion = async () => {
  let pushChanges = true;
  if (!verzhConfig.autoPushToRemote) {
    const pushInput = await prompt(`\nPush new version ${verzhConfig.current}?`, [{name: 'Yes', value: 'yes'}, {name: 'No', value: 'no'}]);
    if (pushInput.toLowerCase() === "no") {
      pushChanges = false;
    }
  }
  if (pushChanges) {
    let spinnerError: Error | null = null;
    await spinner(chalk.blueBright(`Pushing version ${verzhConfig.current}...`), async () => {
      try {
        await $`git push -u ${verzhConfig.remote} ${verzhConfig.releaseBranch}`;
        await $`git push ${verzhConfig.remote} ${verzhConfig.current}`;
      } catch (error) {
        spinnerError = error as Error;
      }
    });
    if (spinnerError) {
      handleError(spinnerError, "Pushing Version");
      echo(chalk.redBright(`Failed to push version ${verzhConfig.current}.`));
      process.exit(1);
    } else {
      echo(chalk.greenBright(`Version ${verzhConfig.current} pushed successfully.`));
    }
  } else {
    echo(chalk.yellowBright(`Version ${verzhConfig.current}  not pushed successfully.`));
  }
};

const createVersion = async (newVersion: string): Promise<void> => {
  if (await hasUncommittedChanges()) {
    const proceed = await prompt(
      chalk.yellow('\nThere are uncommitted changes in your working directory. Proceed anyway? '), [{name: 'Yes', value: 'yes'}, {name: 'No', value: 'no'}]
    );
    
    if (proceed.toLowerCase() !== 'yes') {
      echo(chalk.yellowBright('Version creation cancelled. Please commit or stash your changes first.'));
      process.exit(1);
    }
  }
  if(verzhConfig.updatePackageJson) {
    try {
      const packageJsonPath = 'package.json';
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        packageJson.version = newVersion;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        echo(chalk.greenBright(`Updated version in ${packageJsonPath} to ${newVersion}`));
      }
    }
    catch(error) {
      handleError(error as Error, "Updating package.json");
      return;
    }
  }
  let spinnerError: Error | null = null;
  await spinner(chalk.blueBright("Creating version " + newVersion), async () => {
    verzhConfig = { ...verzhConfig, current: newVersion, precededBy: verzhConfig.current };
    fs.writeFileSync(verConfigPath, JSON.stringify(verzhConfig, null, 2));
    try {
      await $`git add .`;
      await $`git commit -m"New version: ${newVersion}"`;
      await $`git tag -a ${newVersion} -m "New version: ${newVersion}"`;
    } catch (error) {
      spinnerError = error as Error;
    }
  });
  if (spinnerError) {
    handleError(spinnerError, "Pushing Version");
    return;
  }
  echo(chalk.greenBright(`Version ${newVersion} created 👍✅!`));
  await pushVersion();
};

const bump = async (type?: string): Promise<void> => {
  // Update config reading:
  try {
    verzhConfig = JSON.parse(fs.readFileSync(verConfigPath, 'utf8'));
    const validateConfigResponse = validateConfig(verzhConfig);
    if (!validateConfigResponse.isValid) {
      handleError(new Error(validateConfigResponse.message), 'Configuration Validation');
      process.exit(1);
    }
  } catch (error) {
    handleError(error as Error, 'Configuration');
    process.exit(1);
  }
  try {
    let branch: string = (await $`git rev-parse --abbrev-ref HEAD`).stdout.trim();
    if(!type && (verzhConfig.releaseBranch === branch || verzhConfig.preReleaseBranches[branch])) {
      type = verzhConfig.preReleaseBranches[branch] ? "PRE_RELEASE" : "PATCH";
    }
    else {
      handleError(new Error(`Bump type is required. Please specify a type.`), "Bump Type Validation");
      process.exit(1);
    }
    const validateBranchResponse = validateBumpBranchAndType(branch, type, verzhConfig);
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
    
    let version = verzhConfig.current.split("-")[0] ?? "1.0.0";
    let [majorVersion, minorVersion, patchVersion] = version.split(".").map(Number);

    let preRelease: string | undefined;
    let preReleaseName: string | undefined;
    let preReleaseNum: number | undefined;

    if (branch !== verzhConfig.releaseBranch) {
      preRelease = verzhConfig.current.split("-").filter((_, index) => index > 0).join("-") || branch.split("/").join(".") + ".0";
      preReleaseName = preRelease.split(".").filter((_, index, array) => index < array.length - 1).join(".");
      preReleaseNum = Number(preRelease.split(".")[preRelease.split(".").length - 1]);
    }

    if(branch === verzhConfig.releaseBranch) {
      if(type === "MAJOR") {
        majorVersion++;
        minorVersion = 0;
        patchVersion = 0;
      }
      else if(type === "MINOR") {
        minorVersion++;
        patchVersion = 0;
      }
      else if(type === "PATCH") {
        patchVersion++;
      }
    }
    else {
      if (preRelease) {
        preReleaseNum = (preReleaseNum ?? 0) + 1;
        preRelease = `${preReleaseName}.${preReleaseNum}`;
      } else {
        if (branch !== verzhConfig.releaseBranch) {
          preReleaseNum = 1;
          preReleaseName = branch.split("/").join(".");
          preRelease = `${preReleaseName}.${preReleaseNum}`;
        }
      }
    }
    
    const newVersion = `${majorVersion}.${minorVersion}.${patchVersion}${branch === verzhConfig.releaseBranch ? "" : "-" + preRelease}`;
    const validateVersionResponse = validateVersion(newVersion);
    if (!validateVersionResponse.isValid) {
      handleError(new Error(validateVersionResponse.message), "Version Validation");
      process.exit(1);
    }
    
    const pushNewVersionInput = await prompt(`\nCreate new version: ${newVersion} ?`, [{name: 'Yes', value: 'yes'}, {name: 'No', value: 'no'}]);
    if (pushNewVersionInput.toLowerCase() === "yes") {
      await createVersion(newVersion);
    } else {
      echo(chalk.redBright("Version not pushed"));
      process.exit(0);
    }
  }
  catch(error) {
    handleError(error as Error, 'Bumping Version');
  }
  finally {
    process.exit(0);
  }
};

export default bump;
