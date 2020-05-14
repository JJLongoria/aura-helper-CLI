#!/usr/bin/env node --harmony
const Commands = require('./commands');
const program = require('commander');
const inquirer = require("inquirer");

// METADATA COMMANDS
// Local Commands
Commands.Metadata.LocalCompress.createCommand(program);
Commands.Metadata.LocalIgnore.createCommand(program);
Commands.Metadata.LocalList.createCommand(program);
Commands.Metadata.LocalDescribe.createCommand(program);
//Commands.Metadata.LocalCompare.createCommand(program);
Commands.Metadata.LocalRepair.createCommand(program);
Commands.Metadata.LocalPackageGenerator.createCommand(program);
// TODO: Add more types for threat in ignore command
// TODO: Retrieve full profiles
// TODO: Retrieve full permission sets
// TODO: Retrieve full records types
// TODO: Add more runtime generated medatada for retrieve
// TODO: Get queriable objects (refresh metadata index) (all and specifics)
// TODO: Send progress for commands that support it <--


// OrgCommands
Commands.Metadata.OrgList.createCommand(program);
Commands.Metadata.OrgDescribe.createCommand(program);
Commands.Metadata.OrgCompare.createCommand(program);


// Core Commands
//Commands.Core.Update.createCommand(program);


program.parse(process.argv);