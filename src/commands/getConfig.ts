import { $, fs } from 'zx';
import { handleError } from '../utils/helpers';
import { validateConfig, validateGit } from '../utils/validators';
import { ValidationResponse, VersionConfig } from '../utils/types';

$.quiet = true
const configPath = "verzh.config.json";

const getConfig = async (isValidated?: boolean) => {
  let config: VersionConfig;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!isValidated) {
      const validateConfigResponse = await validateConfig(config);
      if (!validateConfigResponse.isValid) {
        throw new Error(validateConfigResponse.message);
      }
    }
  } catch (error) {
    handleError(error as Error, 'Loading Config');
    process.exit(1);
  }

  return config;
};

export default getConfig;
