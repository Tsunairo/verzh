#!/usr/bin/env zx

import { $, fs } from 'zx';
import { handleError } from '../utils/helpers';
import { validateConfig, validateGit } from '../utils/validators';
import { ValidationResponse, VersionConfig } from '../utils/types';

$.verbose = false
const configPath = "verzh.config.json";

const getConfig = async (isValidated?: boolean) => {
  let config: VersionConfig;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!isValidated) {

      const validateConfigResponses = await validateConfig(config);
      const validateGitResponse = await validateGit();
      if (!validateConfigResponses.find(vcr => vcr.isValid) || !validateGitResponse.isValid) {
        let invalidResponses: ValidationResponse[] = [];
        if (validateConfigResponses.filter(vcr => !vcr.isValid).length > 0) {
          invalidResponses = validateConfigResponses;
        }
        if (validateGitResponse.isValid) {
          invalidResponses = [...invalidResponses, validateGitResponse];
        }

        throw new Error(invalidResponses.map(ir => ir.message).join('\n'));
      }
    }
  } catch (error) {
    handleError(error as Error, 'Loading Config');
    process.exit(1);
  }

  return config;
};

export default getConfig;
