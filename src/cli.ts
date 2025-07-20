#!/usr/bin/env node

import { Command } from 'commander';
import { init, bump } from './commands';
import * as fs from 'fs'



const version = JSON.parse(fs.readFileSync('./package.json', 'utf8')).version;
const banner = `
                                      
// Version: ${version}
// Versioning tool for managing project versions and releases

`;

console.log(banner);

const program = new Command();
program
  .name('ver')
  .version(version)
  .description('Versioning tool for managing project versions and releases');

program.command('bump')
  .description('Bump version')
  .option('-t, --type <type>', 'bump type (major, minor, patch, pre-release)')
  .action(async (options) => {
    await bump(options.type);
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