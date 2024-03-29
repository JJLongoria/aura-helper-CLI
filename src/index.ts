#!/usr/bin/env node
import * as Commands from './commands';
import { program } from 'commander';

// METADATA COMMANDS
// Local Commands
Commands.Metadata.LocalCompress.createCommand(program);
Commands.Metadata.LocalIgnore.createCommand(program);
Commands.Metadata.LocalList.createCommand(program);
Commands.Metadata.LocalDescribe.createCommand(program);
//Commands.Metadata.LocalCompare.createCommand(program);
Commands.Metadata.LocalRepair.createCommand(program);
Commands.Metadata.LocalPackageGenerator.createCommand(program);
Commands.Metadata.LocalRetrieveSpecial.createCommand(program);
// TODO: Get queriable objects (refresh metadata index) (all and specifics)

// OrgCommands
Commands.Metadata.OrgList.createCommand(program);
Commands.Metadata.OrgDescribe.createCommand(program);
Commands.Metadata.OrgCompare.createCommand(program);
Commands.Metadata.OrgBetweenCompare.createCommand(program);
Commands.Metadata.OrgRetrieveSpecial.createCommand(program);
Commands.Metadata.OrgPermissions.createCommand(program);
Commands.Metadata.OrgApexExecutor.createCommand(program);

// DATA COMMANDS
Commands.Data.Export.createCommand(program);
Commands.Data.Import.createCommand(program);

// Core Commands
Commands.Core.Update.createCommand(program);
Commands.Core.Version.createCommand(program);


program.parse(process.argv);