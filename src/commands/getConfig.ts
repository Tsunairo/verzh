#!/usr/bin/env zx

import { $, fs } from 'zx';
import { handleError } from '../utils/helpers';
import { validateEnvironment } from '../utils/validators';
import { VersionConfig } from '../utils/types';

$.verbose = false
const configPath = "verzh.config.json";

const getConfig = async (isValidated?: boolean) => {
  let config: VersionConfig;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if(!isValidated) {
      const validateEnvironmentResponse = await validateEnvironment(config);
    
      if(!validateEnvironmentResponse.isValid) {
        throw new Error(validateEnvironmentResponse.message);
      }
    }
  } catch (error) {
    handleError(error as Error, 'Loading Config');
    process.exit(1);
  }
  
  return config;
};

export default getConfig;
