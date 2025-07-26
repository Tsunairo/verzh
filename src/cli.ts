#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import { bump, init, set, push, getConfig } from './commands';

const path = require('path');
const version = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')).version;
const banner = fs.readFileSync(path.join(__dirname, '../banner.txt'), 'utf8').replace('{{version}}', version);

console.log(banner);

// src, tsconfig, verzh.config

const program = new Command();
program
  .name('ver')
  .version(version)
  .description('Versioning tool for managing project versions and releases');
  
program.command('init')
  .description('Initialize the project')
  .action(async () => {
    await init();
  });

program.command('bump')
  .description('Bump version')
  .option('-t, --type <type>', 'bump type (major, minor, patch, pre-release)')
  .option('-f, --force', 'ignore confirmation prompts and force version creation')
  .action(async (options) => {
    console.log(`Bumping version with type: ${options.type || 'auto-detected'} and force: ${options.force}`);
    await bump(options.type, options.force);
  });

program.command('set')
  .description('Set a valid tag')
  .option('-t, --tag <tag>', 'a valid tag (1.0.2 | 1.0.2-dev.2')
  .option('-f, --force', 'ignore confirmation prompts and force version creation')
  .action(async (options) => {
    console.log(`Bumping version with type: ${options.tag || 'auto-detected'} and force: ${options.force}`);

    await set(options.tag, options.force);
  });

program.command('push')
  .description('Push a valid version')
  .option('-t, --tag <tag>', 'a valid tag (1.0.2 | 1.0.2-dev.2')
  .option('-f, --force', 'ignore confirmation prompts and force version creation')
  .action(async (options) => {
    await push(options.tag, options.force);
  });

program.command('current')
  .description('Get current version')
  .action(async () => {
    const config = await getConfig();
    console.log(config.current);
  });

program.command('preceded')
  .description('Get preceding version')
  .action(async () => {
    const config = await getConfig();
    console.log(config.precededBy);
  });

program.parse(process.argv);
