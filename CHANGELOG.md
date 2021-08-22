# Change Log
All notable changes to this project will be documented in this file.
## [3.0.0 - 2020-03-XX]
### Added
- The v3.0.0 is the biggest Update of Aura Helper CLI. This versión implements the Aura Helper Framework created in nodeJS. This framework are robust, faster and better than the old Aura Helper Code. Aura Helper Framework is an open source framework to provide tools to any developer to create applications for salesforce. Aura Helper Extension and Aura Helper CLI use it.

- Added **Aura Helper Framework Modules** to enhance, reuse and optimize code and processes.
- Added new command **metadata:org:permissions** to execute anonymous apex scripts N times.
- Added new command **metadata:org:apex:executor** to execute anonymous apex scripts N times.
- Added new option to **metadata:local:compress** Command for select the sort order for the XML elements when compress.
- Added new option to **metadata:local:ignore** Command for select the sort order for the XML elements when compress.
- Added new options to **metadata:local:repair** Command for select the sort order for the XML elements when compress or to select and use an ignore file to exclude the specified types from checking dependencies.
- Added new option to **metadata:local:retrieve:special** Command for select the sort order for the XML elements when compress.
- Added support up to API v51.0 (and older versions) to all operations (repair dependencies, compress...) and support all types and files.
- Added API Version Option (-v or --api-version) to **data:export** command to use another API Version.
- Added API Version Option (-v or --api-version) to **data:import** command to use another API Version.
- Added API Version Option (-v or --api-version) to **metadata:local:describe** command to use another API Version.
- Added API Version Option (-v or --api-version) to **metadata:local:list** command to use another API Version.
- Added API Version Option (-v or --api-version) to **metadata:local:retrieve:special** command to use another API Version.
- Added API Version Option (-v or --api-version) to **metadata:org:compare:between** command to use another API Version.
- Added API Version Option (-v or --api-version) to **metadata:org:compare** command to use another API Version.
- Added API Version Option (-v or --api-version) to **metadata:org:describe** command to use another API Version.
- Added API Version Option (-v or --api-version) to **metadata:org:list** command to use another API Version.
- Added API Version Option (-v or --api-version) to **metadata:org:retrieve:special** command to use another API Version.
- Added support to compress All XML Files.
- Added support to repair or check error dependencies on all XML Files with Metadata Type Reference. **Supported Types**: *AccountRelationshipShareRule, AnimationRule, AppointmentSchedulingPolicy, BatchCalcJobDefinition, BatchProcessJobDefinition, BlacklistedConsumer, Bot, CareProviderSearchConfig, CleanDataService, Community, ConnectedApp, CustomApplication, CustomFeedFilter, CustomField, CustomObject, CustomObjectTranslation, CustomPageWebLink, CustomPermission, CustomSite, CustomTab, Dashboard, DataSourceObject, DataStreamDefinition, DecisionTable, DecisionTableDatasetLink, DelegateGroup, EmailTemplate, EmbeddedServiceConfig, EmbeddedServiceLiveAgent, EmbeddedServiceMenuSettings, EntitlementProcess, FieldSet, FlexiPage, Flow, FlowCategory, HomePageLayout, Index, Layout, LightningBolt, ListView, LiveChatAgentConfig, LiveChatButton, LiveChatDeployment, MatchingRules, MLDataDefinition, MLPredictionDefinition, ModerationRule, MutingPermissionSet, MyDomainDiscoverableLogin, NamedFilter, NavigationMenu, Network, NotificationTypeConfig, OauthCustomScope, Package, PathAssistant, PaymentGatewayProvider, PermissionSet, PermissionSetGroup, PlatformEventChannel, Portal, PresenceUserConfig, Profile, ProfilePasswordPolicy, ProfileSearchLayouts, ProfileSessionSetting, Prompt, Queue, QuickAction, RecommendationStrategy, RecordActionDeployment, RecordType, Report, ReportType, Role, SalesWorkQueueSettings, SamlSsoConfig, SearchLayouts, ServiceAISetupDefinition, SharingReason, SharingRules, SharingSet, SharingRules, Skill, Territory, TimeSheetTemplate, TopicsForObjects, TransactionSecurityPolicy, Translations, UserProvisioningConfig, ValidationRule, WaveApplication, WaveLens, WaveRecipe, WaveXmd, WebLink, Workflow*

### Changed

- Changed and remove to many code for use **Aura Helper Framework modules**. Changed all references
- Changed **update** Command for use *Aura Helper Framework Modules*
- Changed **version** Command for use *Aura Helper Framework Modules*
- Changed **data:export** Command for use *Aura Helper Framework Modules*
- Changed **data:import** Command for use *Aura Helper Framework Modules*
- Changed **metadata:local:xml:compress** Command for use *Aura Helper Framework Modules*
- Changed **metadata:local:describe** Command for use *Aura Helper Framework Modules*
- Changed **metadata:local:ignore** Command for use *Aura Helper Framework Modules*
- Changed **metadata:local:list** Command for use *Aura Helper Framework Modules*
- Changed **metadata:local:package:create** Command for use *Aura Helper Framework Modules*
- Changed **metadata:local:repair** Command for use *Aura Helper Framework Modules*
- Changed **metadata:local:retrieve:special** Command for use *Aura Helper Framework Modules*
- Changed **metadata:org:compare:between** Command for use *Aura Helper Framework Modules*
- Changed **metadata:org:compare** Command for use *Aura Helper Framework Modules*
- Changed **metadata:org:describe** Command for use *Aura Helper Framework Modules*
- Changed **metadata:org:list** Command for use *Aura Helper Framework Modules*
- Changed **metadata:org:retrieve:special** Command for use *Aura Helper Framework Modules
- **IMPORTANT CHANGE**: Change the Response, Progress and Error bodys to a new format (similar but need adapt response threatments). Now use AuraHelperCLIResponse, AuraHelperCLIProgress, AuraHelperCLIError classes to display the response, progress and errors.
- Changed **README** file to better information order and addapt to Aura Helper Framework Style.

### Fixed
- Fixed minor errors on several commands

## [2.1.2 - 2020-10-21]
### Fixed
- Fixed a little problem with some suffix when describing local metadata types

## [2.1.1 - 2020-08-07]
### Fixed
- Fixed some problems with mac compatibility

## [2.0.0 - 2020-07-17]
### Added
- metadata:org:compare:between - Command for compare two organization to get the differences. Return the metadata that exists on target but not exists on source
- Added support for mac operative system

### Changed
- Change --send-to (-s or --send-to) option on all commands for --output-file.

### Fixed
- Fixed some problems with ignore command

## [1.1.3 - 2020-07-10]
### Fixed
- Fixed XML Attributes loosing when compresing XML Files

## [1.1.2 - 2020-06-30]
### Fixed
- Fixed update command

## [1.1.1 - 2020-06-30]
### Fixed
- Fixed update command
- Fixed documentation on readme with import command

## [1.1.0 - 2020-06-30]
### Added
- Added two new commands (data:export and data:import) for Export and Import Data at tree format and resolve relationships and recordtypes automatically (Beta)
- Added support for compress StandardValueSet XML Metadata File. 

### Changed
- Change commands for return metadata ordered alphabetically.

### Fixed
- Removed not supported StandardValueSet Types by Metadatada API
- Fixed a little problem with the detection of custom objects as local metadata type.
- Fixed a bug with ignore permissions from all profiles

## [1.0.0 - 2020-27-05]
### Added
#### Metadata Commands
- metadata:local:compress - Command for compress XML files for ocuppy less data storage, and make more usefull with SVC systems like Git. With XML Files compressed, the file confilcts on merges are to much easy to resolve.

- metadata:local:ignore - Command for ignore some metadata types. If you use git or other SVC systems, you can construct a .gitignore file or similar for ignore some files from your SVC. But salesforce have some metadata that can't be ignored with git because have into other files, like custom labels, workflows or user permissios for example. This command allow to you to ignore this types of metadata. This command support all metadata types to ignore. (Can delete entire files and folders)

- metadata:local:list - Command for list all Metadata Types stored in your local project. 

- metadata:local:describe - Command for describe all or specific Metadata Types like Custom Objects, Custom Fields, Apex Classes... that you have in your local project.

- metadata:local:repair - Command for repair your project local dependencies. With this command you cand repair automatically or check if have dependencies errors for repair it (or not, because is possible to detect errors because you don't have all metadata into your local project).

- metadata:local:package:create - Command for create the package files. You can create the package and destructive files for deploy and delete (before and after deploy) automatically from different sources. You can chose to create from other package files for merge all packages into only one. Also you can create the package files based on a JSON file (See Metadata JSON Format section) or better, you can create the files from a git differences. You can compare two branches, commits, tags... for detect modifies, new files and deleted metadata for create the package and destructive files with a simple command. Also you can ignore metadata types for not include in package according .ahignore.json file.

- metadata:local:retrieve:special - Command for retrieve the special metadata types stored in your local project. The special types are the types generated at runtime when retrieving data from org according the package data. Files like permission sets, profiles or translations. For example, with this command you can retrieve all permissions from a profile without retrieve anything more. Also you can retrieve only the Custom Object XML Files without retrieve anything more.

- metadata:org:list - Command for list all Metadata Types stored in your auth org

- metadata:org:describe - Command for describe all or specific Metadata Types likes Custom Objects, Custom Fields, Apex Classes... that you have in your auth org

- metadata:org:compare - Command for compare your local project with your auth org for get the differences. The result are the metadata types and objects that you have in your org, but don't have in your local project.

- metadata:org:retrieve:special - Command for retrieve the special metadata types stored in your auth org. The special types are all types generated at runtime when retrieving metadata according the package data. Files like permission sets, profiles or translations. For example, with this command you can retrieve all permissions from a profile without retrieve anything more. Also you can retrieve only the Custom Object XML Files without retrieve anything more.
