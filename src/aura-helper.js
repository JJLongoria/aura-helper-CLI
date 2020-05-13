#!/usr/bin/env node --harmony
const Commands = require('./commands');
const program = require('commander');
const inquirer = require("inquirer");

// METADATA COMMANDS
// Local Commands
Commands.Metadata.Compress.createCommand(program);
Commands.Metadata.Ignore.createCommand(program);
Commands.Metadata.LocalList.createCommand(program);
Commands.Metadata.LocalDescribe.createCommand(program);
//Commands.Metadata.CompareLocal.createCommand(program);
Commands.Metadata.Repair.createCommand(program);
Commands.Metadata.PackageGenerator.createCommand(program);
// TODO: Add more dependencies for repair (record types, topics for object, etc..)
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
Commands.Metadata.CompareOrg.createCommand(program);


// Core Commands
Commands.Core.Update.createCommand(program);


program.parse(process.argv);