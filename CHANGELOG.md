# Change Log
All notable changes to this project will be documented in this file.

## [1.0.0 - 2020-XX-XX]
### Added
#### Metadata Commands
- metadata:local:compress -> Compress XML Metadata Files for best conflict handling with SVC systems. Works with relative or absolute paths
- metadata:local:ignore -> Command for ignore metadata from your project. Use .ahignore.json file for perform this operation. This command will be delete the ignored metadata from your project folder
- metadata:local:list -> Command for list all metadata from the local project
- metadata:local:describe -> Command for describe all metadata from the local project
- metadata:local:repair -> Repair local project such as dependencies on files and metadata types.

- metadata:org:list -> Command for list all metadata from the auth org
- metadata:org:describe -> Command for describe the metadata types from the auth org
- metadata:org.compare -> Command to compare the organization's metadata with local metadata. Returns metadata that does not exist in local but exists in the auth org.

#### Core Commands
- update -> Command for update Aura Helper CLI to the latest version
