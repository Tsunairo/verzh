import { $, fs } from 'zx';
import { applyGitVersionTags, handleError } from '../utils/helpers';
import { validateConfig } from '../utils/validators';
import { VersionConfig } from '../utils/types';

$.quiet = true
const configPath = "verzh.config.json";

export const writeConfig = (config: VersionConfig) => {
  const { current, precededBy, ...fileConfig } = config;
  delete (fileConfig as { name?: string }).name;
  fs.writeFileSync(configPath, JSON.stringify(fileConfig, null, 2));
};

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
    config = await applyGitVersionTags(config);
  } catch (error) {
    handleError(error as Error, 'Loading Config');
    process.exit(1);
  }

  return config;
};

export default getConfig;
