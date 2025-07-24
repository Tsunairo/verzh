#!/usr/bin/env zx

import { $ } from 'zx';
import { VersionConfig } from '../utils/types';
import { loadConfig } from '../utils/helpers';

$.verbose = false
const configPath = "verzh.config.json";

const getConfig = async () => {
  let config: VersionConfig = await loadConfig(configPath);
  
  return config;
};

export default getConfig;
