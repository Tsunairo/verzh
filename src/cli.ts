#!/usr/bin/env node

import { Command } from 'commander';
import { init, bump } from './commands';
import * as fs from 'fs'
const path = require('path');



const version = JSON.parse(fs.readFileSync(path.join(__dirname, 'verzh.config.json'), 'utf8')).version;
const banner = fs.readFileSync(path.join(__dirname, 'banner.txt'), 'utf8').replace('{{version}}', version);

console.log(banner);

const program = new Command();
program
  .name('ver')
  .version(version)
  .description('Versioning tool for managing project versions and releases');

program.command('bump')
  .description('Bump version')
  .option('-t, --type <type>', 'bump type (major, minor, patch, pre-release)')
  .option('-f, --force', 'ignore confirmation prompts and force version creation')
  .action(async (options) => {
    await bump(options.type, options.force);
  });

  program.command('init')
  .description('Initialize the project')
  .action(async () => {

    await init();
  });

program.parse(process.argv);
/*
To run the "init" command from the terminal, use:
  node /workspaces/ver/bin/cli.mjs init

Or, if you have made the file executable (with chmod +x /workspaces/ver/bin/cli.mjs), you can run:
  ./bin/cli.mjs init
*/