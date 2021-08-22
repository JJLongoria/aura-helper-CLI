# **Aura Helper CLI**

Command Line Interface to work with Salesforce Projects and Support Aura Helper Plugin for VSCode. Have powerfull commands for manage your projects. Aura Helper CLI requires [SFDX CLI](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_install_cli.htm) for work properly. 

### **Specially Designed for DevOps Workflows**

Supported Operative Systems:
- Windows
- Linux
- Mac OS X

## Features

- Simplify your work with **Salesforce and Git** with the command for *create packages* (for deploy and delete) from git changes. **Compare** two *branches*, *commits* or *tags* for create the files for deploy your package.
- **Repair** file *dependencies errors* on your project files or **Check only** to resolve errors manually.
- **Compress your XML Files** structure for make easy *identify changes* and resolve *git conflicts*. Also need less storage and work faster.
- **Retrieve special Metadata Types** like *profiles* or *permissions* sets (and others) with all data without retrieve any file more with a simple command.
- **Compare** your *local data* with your *authorized organization* for get the differences for delete, retrieve or anything you want. Or **Compare** the Metadata Types *between two orgs* to see the differences.
- **Merge** diferent **package** or **destructive** files into one file with only one command. 
- **Ignore** any metadata type from your local project or from the package files for maintance different configuration into your sandbox and production enviroments with simple file and command.
- Specially designed for **DevOps workflows**.
- And much more
---

## *Table of Contents*

- [**Installation Guide**](#installation-guide)

- [**AH CLI Commands**](#ah-cli-commands)

- [**AH CLI JSON Responses**](#ah-cli-json-responses)

- [**Ignore File**](#ignore-file)

- [**Metadata JSON Format**](#metadata-json-format)

---

# [**Installation Guide**](#installation-guide)
## [**NPM Installation (Recommended)**](#installation)

At the moment, Aura Helper CLI only support installation with NPM manager. This means that you need install Node JS on your computer for install Aura Helper CLI.

For install NodeJS on Windows systems go to [Node JS Webpage](https://nodejs.org/) and download the latest version for Windows.

For install NodeJS on Linux systems go to ["Installing Node.js via package manager"](https://nodejs.org/en/download/package-manager/) and choose the correct option according your linux system.

With NodeJS installed on your system, now open a terminal (CMD, Bash, Power Shell...) and run the next command:

    npm install -g aura-helper-cli

---

# [**AH CLI Commands**](#ah-cli-commands)
All commands from Aura Helper CLI have the next structure: 

    aura-helper <command:name> [command:input] [options]

---

### *Commands Group*

- [**Help**](#help)
<p></p>

- [**Metadata Commands**](#metadata-commands)
  - [**Local Metadata Commands**](#local-metadata-commands)
  - [**Org Metadata Commands**](#org-metadata-commands)
<p></p>

- [**Data Commands**](#data-commands)
<p></p>

- [**Core Commands**](#core-commands)

---

# [**Help**](#help)
If you need help with Aura Helper CLI, you can run:

    aura-helper --help or aura-helper -h

# [**Metadata Commands**](#metadata-commands)
Metadata commands are the commands for work with your metadata files. You can compress xml files, list or describe metadata types that you have on your org or in your local project. Can compare local and org metadata or ignore some metadata types according .ahignore.json file (see [Ignore File](#ignore-file) section). Also you can repair project metadata dependencies and much more. These commands are bellow two big groups. Local and Org commands. The Local commands work only with the metadata types that you have in your local project. The Org commands are commands for work with the data in your auth org.

## [**Local Metadata Commands**](#local-metadata-commands)

  - [**metadata\:local\:compress**](#metadatalocalcompress)

    Command for compress XML files for ocuppy less data storage, and make more usefull with SVC systems like Git. With XML Files compressed, the file confilcts on merges are to much easy to resolve.

  - [**metadata\:local\:ignore**](#metadatalocalignore)

    Command for ignore some metadata types. If you use git or other SVC systems, you can construct a .gitignore file or similar for ignore some files from your SVC. But salesforce have some metadata that can't be ignored with git because have into other files, like custom labels, workflows or user permissios for example. This command allow to you to ignore this types of metadata. This command support all metadata types to ignore. (Can delete entire files and folders)

  - [**metadata\:local\:list**](#metadatalocallist)

    Command for describe all or specific Metadata Types like Custom Objects, Custom Fields, Apex Classes... that you have in your local project.

  - [**metadata\:local\:describe**](#metadatalocaldescribe)

    Command for describe all or specific Metadata Types like Custom Objects, Custom Fields, Apex Classes... that you have in your local project.

  - [**metadata\:local\:repair**](#metadatalocalrepair)

    Command for repair your project local dependencies. With this command you cand repair automatically or check if have dependencies errors for repair it (or not, because is possible to detect errors because you don't have all metadata into your local project).

  - [**metadata\:local\:package\:create**](#metadatalocalpackagecreate)

    Command for repair create the package files. You can create the package and destructive files for deploy and delete (before and after deploy) automatically from different sources. You can chose to create from other package files for merge all packages into only one. Also you can create the package files based on a JSON file (See [Metadata JSON Format](#metadata-file) section) or better, you can create the files from a git differences. You can compare two branches, commits, tags... for detect modifies, new files and deleted metadata for create the package and destructive files with a simple command. Also you can ignore metadata types for not include in package according .ahignore.json file.

  - [**metadata\:local\:retrieve\:special**](#metadatalocalretrievespecial)

    Command for retrieve the special metadata types stored in your local project. The special types are the types generated at runtime when retrieving data from org according the package data. Files like permission sets, profiles or translations. For example, with this command you can retrieve all permissions from a profile without retrieve anything more. Also you can retrieve only the Custom Object XML Files without retrieve anything more.

---
### [**metadata\:local\:compress**](#metadatalocalcompress)
Command for compress XML files for ocuppy less data storage, and make more usefull with SVC systems like Git. With XML Files compressed, the file confilcts on merges are to much easy to resolve.

### **Options**:

    -r | --root <path/to/project/root>              Path to project root. By default is your current folder.
    -s | --sort-order <sortOrder>                   Sort order for the XML elements when compress XML files. By default, the elements are sorted with simple XML 
                                                    elements first. Values: simpleFirst, complexFirst, alphabetAsc, alphabetDesc
    -a | --all                                      Compress all XML files with support compression in your project.
    -d | --directory <path/to/directory>            Compress XML Files from specific directory. This options does not take effect if you choose compress all.
    -f | --file <path/to/file>                      Compress the specified XML file. This options does not take effect if you choose compress directory or all.
    -p | --progress <format>                        Option for report the command progress. Available formats: plaintext, json
    -b | --beautify                                 Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for 
                                                    Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...).

### **Examples**:

Compress All XML metadata files on your salesforce project:

    aura-helper metadata:local:compress -a

Compress All XML Files for objects folder (and subfolders) with progress report and showing output with colors:

    aura-helper metadata:local:compress -d force-app/main/default/objects -p plaintext -b

Compress Account XML File:

    aura-helper metadata:local:compress -f force-app/main/default/objects/Account/Account.object-meta-xml

### [**metadata\:local\:ignore**](#metadatalocalcompress)
Command for ignore some metadata types. If you use git or other SVC systems, you can construct a .gitignore file or similar for ignore some files from your SVC. But salesforce have some metadata that can't be ignored with git because have into other files, like custom labels, workflows or user permissios for example. This command allow to you to ignore this types of metadata. This command support all metadata types to ignore. (Can delete entire files and folders)

### **Options**:

    -r | --root <path/to/project/root>              Path to project root. By default is your current folder.
    -a | --all                                      Ignore all metadata types according to the ignore file.
    -t | --type <MetadataTypeNames>                 Ignore the specified metadata types according to the ignore file. You can select a sigle or a list separated by 
                                                    commas. 
                                                    This options does not take effect if you choose ignore all.
    -i | --ignore-file <path/to/ignore/file>        Path to the ignore file. Use this if you not want to use the project root ignore file or have different name. By 
                                                    default use .ahignore.json file from your project root.
    -c | --compress                                 Add this option for compress modified files for ignore operation.
    -s | --sort-order <sortOrder>                   Sort order for the XML elements when compress XML files. By default, the elements are sorted with simple XML 
                                                    elements first. Values: simpleFirst, complexFirst, alphabetAsc, alphabetDesc
    -p | --progress <format>                        Option for report the command progress. Available formats: plaintext, json.
    -b | --beautify                                 Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for 
                                                    Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...).

### **Examples**:

Ignore All metadata types specified in .ahignore.json file with progress report, colors and compressing files

    aura-helper metadata:local:ignore -a -p plaintext -b -c

Ignore only Custom Application, Custom Labels and Profiles specified in .ahignore.json file with another .ahignore.json

    aura-helper metadata:local:ignore -t "CustomApplication, Profile, CustomLabels" -i "Path/to/the/file/.myignoreFile.json"


### [**metadata\:local\:list**](#metadatalocallist) 
Command for list all Metadata Types stored in your local project. 

### **Options**:

    -r | --root <path/to/project/root>              Path to project root. By default is your current folder.
    --output-file <path/to/output/file>             Path to file for redirect the output.
    -v | --api-version <apiVersion>                 Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the 
                                                    sfdx-project. json file
    -p | --progress <format>                        Option for report the command progress. Available formats: plaintext, json.
    -b | --beautify                                 Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for 
                                                    Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...).

### **Examples**:

List all types with progress report and colorized output

    aura-helper metadata:local:list -p plaintext -b

List all types from different project and save the output into a file

    aura-helper metadata:local:list -r "path/to/other/project/root" -s "path/to/the/output/file.txt"


### [**metadata\:local\:describe**](#metadatalocaldescribe)
Command for describe all or specific Metadata Types like Custom Objects, Custom Fields, Apex Classes... that you have in your local project.

### **Options**:

    -r | --root <path/to/project/root>              Path to project root. By default is your current folder.
    -a | --all                                      Describe all metadata types stored in your local project.
    -t | --type <MetadataTypeNames>                 Describe the specified metadata types. You can select a single metadata or a list separated by commas. This 
                                                    option does not take effect if you choose describe all.
    -v | --api-version <apiVersion>                 Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the 
                                                    sfdx-project. json file
    --output-file <path/to/output/file>             Path to file for redirect the output.
    -p | --progress <format>                        Option for report the command progress. Available formats: plaintext, json.
    -b | --beautify                                 Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for 
                                                    Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...).

### **Examples**:

Describe all metadata types stored in your local project with progress report and save the response into a file

    aura-helper metadata:local:describe -a -p plaintext -s "path/to/the/output/file.txt"

Describe Custom Objects, Custom Fields, Profiles and ValidationRules from your local project with colorized output.

    aura-helper metadata:local:describe -t "CustomObject, CustomField, Profile, ValidatiionRule" -b                      


### [**metadata\:local\:repair**](#metadatalocalrepair)
Command for repair your project local dependencies. With this command you cand repair automatically or check if have dependencies errors for repair it (or not, because is possible to detect errors because you don't have all metadata into your local project).

### **Options**:

    -r | --root <path/to/project/root>              Path to project root. By default is your current folder.
    -a | --all                                      Repair all supported metadata types. Custom Applications, Profiles and Permission Sets.
    -t | --type <MetadataTypeNames>                 Repair specified metadata types. You can choose single type or a list separated by commas, also you can choose 
                                                    to  repair a specified objects like "MetadataTypeAPIName:MetadataObjectAPIName". For example 
                                                    "CustomApplication:AppName1" for repair only AppName1 Custom App. This option does not take effet if select 
                                                    repair all.
    -o | --only-check                               If you select this options, the command not repair dependencies, instead return the errors on the files for 
                                                    repair manually.
    -c | --compress                                 Add this option for compress modifieds files for repair operation.
    -s | --sort-order <sortOrder>                   Sort order for the XML elements when compress XML files. By default, the elements are sorted with simple XML 
                                                    elements first. Values: simpleFirst, complexFirst, alphabetAsc, alphabetDesc
    -u | --use-ignore                               Option for ignore the metadata included in ignore file from the repair command.
    -i | --ignore-file <path/to/ignore/file>        Path to the ignore file. Use this if you not want to use the project root ignore file or have different name. By 
                                                    default use .ahignore.json file from your project root.
    -p | --progress <format>                        Option for report the command progress. Available formats: plaintext, json.
    -b | --beautify                                 Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for 
                                                    Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...).
    --output-file <path/to/output/file>             If you choose --only-check, you can redirect the output to a file.

### **Examples**:

Repair all supported types with progress report and compress repaired files

    aura-helper metadata:local:repair -a -c -p plaintext

Repair Custom Aplication named App1, All profiles and Two permission sets named Perm1 and Perm2 with colorized output

    aura-helper metadata:local:repair -t "CustomApplication:App1,Profile,PermissionSet:Perm1,PermissionSet:Perm2" -b

Check only the errors on profiles and save the output on a file

    aura-helper metadata:local:repair -t "Profile" -o -s ""path/to/the/output/errors.txt""

### [**metadata\:local\:package\:create**](#metadatalocalpackagecreate) 
Command for repair create the package files. You can create the package and destructive files for deploy and delete (before and after deploy) automatically from different sources. You can chose to create from other package files for merge all packages into only one. Also you can create the package files based on a JSON file (See [Metadata JSON Format](#metadata-file) section) or better, you can create the files from a git differences. You can compare two branches, commits, tags... for detect modifies, new files and deleted metadata for create the package and destructive files with a simple command. Also you can ignore metadata types for not include in package according .ahignore.json file.

### **Options**:

    -r | --root <path/to/project/root>              Path to project root. By default is your current folder.
    -o | --output-path <target/files/path>          Path for save the generated files. By default is your manifest folder.
    -c | --create-type <createType>                 Option for select the generated type file. You can choose between package, destructive or both. Package by default
    -f | --create-from <createFrom>                 Option for select the source for generate the package. You can choose between git, json or package.
    -d | --delete-order <beforeOrAfter>             This option allow to the user for select the order for delete metadata. Available values are before or after 
                                                    (after by  default). If you select before, destructiveChanges will be deployed before the package, after option 
                                                    deploy destructive changes after the package file.
    -s | --source <source>                          Option for select a source for compare. If you select create-from git, available values are a branch name, tag 
                                                    name or commit reference (or use "this" for select the active branch). If you select create-from json, the value 
                                                    are the path to the file. If you select create-from package, the values are a comma-separated list of the package 
                                                    paths, the package.xml files will be merge on one package, and same with destructiveChanges.xml files.
    -t | --target <target>                          Option for select a target for compare. If you select create-from git, available values are a branch name, tag 
                                                    name or commit reference. This options is only available for create-from git.
    -r | --raw                                      Option for return the data for crate the pacakge. With this options, the package and destructive files don\'t 
                                                    will be create, instead the output are the json file for create a package or use for another pourpose. This 
                                                    options only works for if you select --create-from git.
    -v | --api-version <apiVersion>                 Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from 
                                                    the sfdx-project.json file.
    -u | --use-ignore                               Option for ignore the metadata included in ignore file from the package and destructive files.
    -i | --ignore-file <path/to/ignore/file>        Path to the ignore file. Use this if you not want to use the project root ignore file or have different name. By 
                                                    default use .ahignore.json file from your project root.
    -e | --explicit                                 If you select explicit option, the package will contains all object names explicit on the file, in otherwise, the 
                                                    package generator will be use a wildcard (*) when is necessary (All Childs from a metadata type are selected for 
                                                    deploy). Explicit option are fully recomended for retrieve metadata. This option only works if you select 
                                                    --create-from json.
    -p | --progress <format>                        Option for report the command progress. Available formats: plaintext, json.
    -b | --beautify                                 Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for 
                                                    Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...).


### **Examples**:

Create the package and destructive files from differences from the active branch and master with ignored metadata and custom api version with progress report

    aura-helper metadata:local:package:create -c both -f git -s this -t origin/master -u -p -v 45

Create the package from a JSON file and explicit metadata

    aura-helper metadata:local:package:crate -c package -f json -s "path/to/json/package.json" -e

Merging other packages and destructive files for create only both files.

    aura-helper metadata:local:package:create -c both -f package -s "path/to/package1/package.xml, path/to/package2/package.xml, path/to/destructive1/destructiveChanges.xml, path/to/destructive2/destructiveChangesPost.xml"


### [**metadata\:local\:retrieve\:special**](#metadatalocalretrievespecial)
Command for retrieve the special metadata types stored in your local project. The special types are the types generated at runtime when retrieving data from org according the package data. Files like permission sets, profiles or translations. For example, with this command you can retrieve all permissions from a profile without retrieve anything more. Also you can retrieve only the Custom Object XML Files without retrieve anything more.

### **Options**:

    -r | --root <path/to/project/root>              Path to project root. By default is your current folder.
    -a | --all                                      Retrieve all supported metadata types (Profile, PermissionSet, Translation, RecordType, CustomObject).
    -t | --type <MetadataTypeNames>                 Retrieve specifics metadata types. You can choose one or a comma separated list of elements. Also you can choose 
                                                    retrieve a specific profile, object o record type. Schema -> "Type1" or "Type1,Type2" or "Type1:Object1, 
                                                    Type1:Object2" or "Type1:Object1:Item1" for example:  "Profile, PermissinSet" for retrieve all profiles and 
                                                    permission sets. "Profile:Admin" for retrieve the admin profile. "RecordType:Account:RecordType1" for  retrieve 
                                                    the RecordType1 for the object Account or "RecordType:Account" for retrieve all Record Types for Account.
    -i | --include-org                              With this option, you can retrieve the with the data from org and not only for local, but only retrieve the types 
                                                    that you have in your local.
    -o | --org-namespace                            If you choose include data from org, also you can choose if include all data from the org, or only the data from 
                                                    your org namespace.
    -c | --compress                                 Compress the retrieved files.
    -s | --sort-order <sortOrder>                   Sort order for the XML elements when compress XML files. By default, the elements are sorted with simple XML 
                                                    elements first. Values: simpleFirst, complexFirst, alphabetAsc, alphabetDesc
    -v | --api-version <apiVersion>                 Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the 
                                                    sfdx-project. json file
    -p | --progress <format>                        Option for report the command progress. Available formats: plaintext, json.
    -b | --beautify                                 Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for 
                                                    Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...).

### **Examples**:
    
    Retrieve all supported types only including org data and only org namespace data, progress report and file compression

        aura-helper metadata:local:retrieve:special -a -c -i -o -p plaintext

    Retrieve All Profiles, Perm1 and Perm2 Permission Sets, all Case RecordTypes and RtName Account Recordtype with colorized output and progress report

        aura-helper metadata:local:retrieve:special -t "Profile, PermissionSet:Perm1, PermissionSet:Perm2, RecordType:Case, RecordType:Account:RtName" -p plaintext -b

## [**Org Metadata Commands**](#org-metadata-commands)

  - [**metadata\:org\:list**](#metadataorglist)

    Command for list all Metadata Types stored in your auth org

  - [**metadata\:org\:describe**](#metadataorgdescribe)

    Command for describe all or specific Metadata Types likes Custom Objects, Custom Fields, Apex Classes... that you have in your auth org

  - [**metadata\:org\:compare**](#metadataorgcompare)

    Command for compare your local project with your auth org for get the differences. The result are the metadata types and objects that you have in your org, but don't have in your local project.

  - [**metadata:org:compare:between**](#metadataorgcomparebetween)

    Command for compare between two different orgs. The result are the metadata types that exists in on target, but not exists on source.

  - [**metadata\:org\:retrieve\:special**](#metadataorgretrievespecial)

    Command for retrieve the special metadata types stored in your auth org. The special types are all types generated at runtime when retrieving metadata according the package data. Files like permission sets, profiles or translations. For example, with this command you can retrieve all permissions from a profile without retrieve anything more. Also you can retrieve only the Custom Object XML Files without retrieve anything more.

  - [**metadata\:org\:permissions**](#metadataorgpermissions)

    Command for get all available User permisions in your org.

  - [**metadata\:org\:apex\:executor**](#metadataorgapexexecutor)

    Command for get all available User permisions in your org.

---
### [**metadata\:org\:list**](#metadataorglist) 
Command for list all Metadata Types stored in your auth org

### **Options**:

    -r | --root <path/to/project/root>              Path to project root. By default is your current folder.
    --output-file <path/to/output/file>             Path to file for redirect the output.
    -v | --api-version <apiVersion>                 Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the 
                                                    sfdx-project. json file
    -p | --progress <format>                        Option for report the command progress. Available formats: plaintext, json.
    -b | --beautify                                 Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for 
                                                    Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...).


### **Examples**:

List all types with progress report and colorized output

    aura-helper metadata:org:list -p plaintext -b

List all types from different project and save the output into a file

    aura-helper metadata:org:list -r "path/to/other/project/root" -s "path/to/the/output/file.txt"

### [**metadata\:org\:describe**](#metadataorgdescribe)
Command for describe all or specific Metadata Types likes Custom Objects, Custom Fields, Apex Classes... that you have in your auth org

### **Options**:

    -r | --root <path/to/project/root>              Path to project root. By default is your current folder.
    -a | --all                                      Describe all metadata types stored in your local project.
    -t | --type <MetadataTypeNames>                 Describe the specified metadata types. You can select a single metadata or a list separated by commas. This 
                                                    option does not take effect if you choose describe all.
    -o | --org-namespace                            Describe only metadata types from your org namespace.
    --output-file <path/to/output/file>             Path to file for redirect the output.
    -v | --api-version <apiVersion>                 Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the 
                                                    sfdx-project. json file
    -p | --progress <format>                        Option for report the command progress. Available formats: plaintext, json.
    -b | --beautify                                 Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for 
                                                    Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...).

### **Examples**:

Describe all metadata types only stored in your org, only from the org namespace, with progress report and save the response into a file

    aura-helper metadata:org:describe -a -o -p plaintext -s "path/to/the/output/file.txt"

Describe Custom Objects, Custom Fields, Profiles and ValidationRules from your org with colorized output.

    aura-helper metadata:org:describe -t "CustomObject, CustomField, Profile, ValidatiionRule" -b 

### [**metadata\:org\:compare**](#metadataorgcompare)
Command for compare your local project with your auth org for get the differences. The result are the metadata types and objects that you have in your org, but don't have in your local project.

### **Options**:

    -r | --root <path/to/project/root>              Path to project root. By default is your current folder.
    --output-file <path/to/output/file>             Path to file for redirect the output.
    -v | --api-version <apiVersion>                 Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the 
                                                    sfdx-project. json file
    -p | --progress <format>                        Option for report the command progress. Available formats: plaintext, json.
    -b | --beautify                                 Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for 
                                                    Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...).

### **Examples**:

Compare the local and org data with progress report and colorized output

    aura-helper metadata:org:compare -p plaintext -b

### [**metadata:org:compare:between**](#metadataorgcomparebetween)

 Command for compare between two different orgs. The result are the metadata types that exists in on target, but not exists on source.

### **Options**:

    -r | --root <path/to/project/root>              Path to project root. By default is your current folder.
    -s | --source <sourceUsernameOrAlias>           Source Salesforce org to compare. If you want to compare your active org with other, this options is not necessary 
                                                    because use the --root option for get the project\'s auth org. If you choose source, --root will be ignored.
    -t | --target <targetUsernameOrAlias>           Target Salesforce org to compare.
    --output-file <path/to/output/file>             Path to file for redirect the output.
    -v | --api-version <apiVersion>                 Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the 
                                                    sfdx-project. json file
    -p | --progress <format>                        Option for report the command progress. Available formats: plaintext, json.
    -b | --beautify                                 Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for 
                                                    Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...).

### **Examples**:

Compare between to orgs with report and colorized output.

    aura-helper metadata:org:compare:between -s test.username@salesforceOrg.com.uat -t test.username@salesforceOrg.com.qa -p plaintext -b

### [**metadata\:org\:retrieve\:special**](#metadataorgcomparebetween)
Command for retrieve the special metadata types stored in your auth org. The special types are all types generated at runtime when retrieving metadata according the package data. Files like permission sets, profiles or translations. For example, with this command you can retrieve all permissions from a profile without retrieve anything more. Also you can retrieve only the Custom Object XML Files without retrieve anything more.

### **Options**:

    -r | --root <path/to/project/root>              Path to project root. By default is your current folder.
    -a | --all                                      Retrieve all supported metadata types (Profile, PermissionSet, Translation, RecordType, CustomObject).
    -t | --type <MetadataTypeNames>                 Retrieve specifics metadata types. You can choose one or a comma separated list of elements. Also you can choose 
                                                    retrieve a specific profile, object o record type. Schema -> "Type1" or "Type1,Type2" or "Type1:Object1, 
                                                    Type1:Object2" or "Type1:Object1:Item1" for example:  "Profile, PermissinSet" for retrieve all profiles and 
                                                    permission sets. "Profile:Admin" for retrieve the admin profile. "RecordType:Account:RecordType1" for  retrieve 
                                                    the RecordType1 for the object Account or "RecordType:Account" for retrieve all Record Types for Account.
    -i | --include-org',                            With this option, you can retrieve the data from org and not only for local, but only retrieve the types that you 
                                                    have in your local.
    -o | --org-namespace                            If you choose include data from org, also you can choose if include all data from the org, or only the data from 
                                                    your org namespace.
    -c | --compress                                 Compress the retrieved files.
    -s | --sort-order <sortOrder>                   Sort order for the XML elements when compress XML files. By default, the elements are sorted with simple XML 
                                                    elements first. Values: simpleFirst, complexFirst, alphabetAsc, alphabetDesc
    -v | --api-version <apiVersion>                 Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the 
                                                    sfdx-project. json file
    -p | --progress <format>                        Option for report the command progress. Available formats: plaintext, json.
    -b | --beautify                                 Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for 
                                                    Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...).

### **Examples**:

Retrieve all supported types with only org namespace data, progress report and file compression

    aura-helper metadata:org:retrieve:special -a -c -o -p plaintext

Retrieve All Profiles, Perm1 and Perm2 Permission Sets, all Case RecordTypes and RtName Account Recordtype with colorized output and progress report

    aura-helper metadata:org:retrieve:special -t "Profile, PermissionSet:Perm1, PermissionSet:Perm2, RecordType:Case, RecordType:Account:RtName" -p plaintext -b

### [**metadata\:org\:permissions**](#metadataorgcomparebetween)
Command for get all available User permisions in your org.

### **Options**:

    -r | --root <path/to/project/root>              Path to project root. By default is your current folder.
    -v | --api-version <apiVersion>                 Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the 
                                                    sfdx-project. json file
    -p | --progress <format>                        Option for report the command progress. Available formats: plaintext, json.
    -b | --beautify                                 Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for 
                                                    Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...).

### **Examples**:

Get all user permission from your auth org and your project api version with colorized output and progress report

    aura-helper metadata:org:permissions -b -p plaintext

Get all user permission from your auth org for a specific api version with colorized output and progress report

    aura-helper metadata:org:permissions -v 45.0 -b -p plaintext

### [**metadata\:org\:apex\:executor**](#metadataorgapexexecutor)
Command for get all available User permisions in your org.

### **Options**:

    -r | --root <path/to/project/root>              Path to project root. By default is your current folder.
    -f | --file <path/to/apex/script>               Path to the Anonymous Apex Script file.
    -l | --print-log                                Option to print the result log of every execution
    -i | --iterations <number/of/iterations>        Option for select the scritp execution number. For example, 3 for execute the script 3 times
    -v | --api-version <apiVersion>                 Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the 
                                                    sfdx-project. json file
    -p | --progress <format>                        Option for report the command progress. Available formats: plaintext, json.
    -b | --beautify                                 Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for 
                                                    Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...).

### **Examples**:

Execute an script 3 times without printing log with colorized output and progress report

    aura-helper metadata:org:apex:executor -f "pathh/to/script.apex" -i 3 -b -p plaintext

    Execute an script 10 times wit printing log, colorized output and progress report

    aura-helper metadata:org:apex:executor -f "pathh/to/script.apex" --iterations 3 --print-log -b -p plaintext

---

# [**Data Commands**](#data-commands)
Data commands are the commands for work with data stored in your orgs. You can export and import data between orgs with two simple commands. You can export related objects and import all throgth one command, and Aura Helper automatically match the record types and related objects with their parents. Don't have any salesforce limits and you can export and import all data that you need.

  - [**data:export**](#dataexport)

    Command for export data from the project's auth org or any other org that you have access. This command use the tree:export command from sfdx with plan. If you want to resolve record types automatically on import, you must extract the field "RecordType.DeveloperName" into the query. For resolve parent-child relationship, you must extract the parent field into the childs subquery.

  - [**data:import**](#dataimport)

    Command for import data extracted from data:export (or sfdx tree:export with a plan) and use the tree:import command from sfdx. Unlike the export command. The import command pre process the extracted data before insert for link record types if apply, save and resolve object references, and avoid the salesforce limits. For link record types automatically, you must include in the export query this field "RecordType.DeveloperName" and Aura Helper CLI automatically resolve the record types on target org. For link child objects with their parents, you must extract the parent object into the childs subqueries. Also, you can import data directly from other org.

---
## [**data:export**](#dataexport)
Command for export data from the project's auth org or any other org that you have access. This command use the tree:export command from sfdx with plan. If you want to resolve record types automatically on import, you must extract the field "RecordType.DeveloperName" into the query. For resolve parent-child relationship, you must extract the parent field into the childs subquery.

### **Options**:

    -r | --root <path/to/project/root>              Path to project root. By default is your current folder
    -q | --query <query>                            Query for extract data. You can use a simple query (Select [fields] from [object] [where] ...) or a complex query 
                                                    (select [fields], [query], [query] from [object] [where] ...) for export data in tree format.
    -u | --username <username/or/alias>             Username or Alias for extract the data from a diferent org than the auth org in the project.
    -o | --output-path <path/to/output/dir>         Path for save the generated output files. By default save result on <actualDir>/export.
    -x | --prefix <prefixForCreatedFiles>           Prefix for add to the generated files.
    -v | --api-version <apiVersion>                 Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the 
                                                    sfdx-project. json file
    -p | --progress <format>                        Option for report the command progress. Available formats: plaintext, json.
    -b | --beautify                                 Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for 
                                                    Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...).

### **Examples**:

Export all account records with contacts with progress report and beautify

    aura-helper data:export -q "Select Id, Name, BillingNumber, (Select Id, Name, AccountId, Phone from Contacts) from Account" -o "./export/accounts" -p plaintext -b

Export all accounts for link with record type with progress report and beautify

    aura-helper data:export -q "Select Id, Name, BillingNumber, RecordType.DeveloperName from Account" -o "./export/accounts" -p plaintext -b


## [**data:import**](#dataimport) 
Command for import data extracted from data:export (or sfdx tree:export with a plan) and use the tree:import command from sfdx. Unlike the export command. The import command pre process the extracted data before insert for link record types if apply, save and resolve object references, and avoid the salesforce limits. For link record types automatically, you must include in the export query this field "RecordType.DeveloperName" and Aura Helper CLI automatically resolve the record types on target org. For link child objects with their parents, you must extract the parent object into the childs subqueries. Also, you can import data directly from other org.

### **Options**:

    -r | --root <path/to/project/root>              Path to project root. By default is your current folder
    -f | --file <path/to/exported/file>             Path to the exported file with data:export command for import into the auth org.
    -n | --records-number <recordsPerBatch>         Number of records to insert at one time. Limit are 200 records. (200 by default).
    -s | --source-org <username/or/alias>           Username or Alias to the source org for import data from the org, not from a file.
    -q | --query <query>                            Query for extract data. You can use a simple query (Select [fields] from [object] [where] ...) or a complex query
                                                    (select [fields], [query], [query] from [object] [where] ...) for export data in tree format.
    -v | --api-version <apiVersion>                 Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the 
                                                    sfdx-project. json file
    -p | --progress <format>                        Option for report the command progress. Available formats: plaintext, json.
    -b | --beautify                                 Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for 
                                                    Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...).

### **Examples**:

Import all account records with contacts with progress report and beautify from other org

    aura-helper data:import -s "aliasOrg" -q "Select Id, Name, BillingNumber, (Select Id, Name, AccountId, Phone from Contacts) from Account" -p plaintext -b

Import all accounts from a plan file and process 50 accounts maximum per batch.

    aura-helper data:import -f "./export/accounts/accounts-plan.json" -n 50 -p plaintext -b

---

# [**Core Commands**](#core-commands)

Commands to execute operations related with Aura Helper and not with Salesforce like get the installed version or update to the latest version.

  - [**version**](#version)
  
    Command for get the installed Aura Helper CLI version

  - [**update**](#update) 

    Command for update Aura Helper CLI to the latest version

---
## [**version**](#version) 
Command for get the installed Aura Helper CLI version

### **Examples**:

Get Aura Helper CLI Installed version

    aura-helper version

## [**update**](#update) 

Command for update Aura Helper CLI to the latest version

### **Examples**:

Update Aura Helper CLI to the latest version

    aura-helper update

# [**AH CLI JSON Responses**](#ah-cli-json-responses)

Aura Helper CLI has the same base JSON structure to all response but the error and progress responses has additional fields.

    {
        status: value, // Number Value
        message: value, // String value 
        result: value, // Object or Array value
    }

## [**AH CLI OK Response**](#ah-cli-ok-response)

The response when commands run successfully and not throw any error has the status value always with value 0 and the result object can ben an Object or Array with the command data response.

    {
        status: 0, // ALWAYS
        message: value, // String value 
        result: value, // Object or Array value
    }

## [**AH CLI Progress Response**](#ah-cli-progress-response)

If you choose *JSON (json)* format to show the progress, the response is similar to OK response, but have inProgress flag field and the increment and progress into the result object. If can't calculate the percetage progress, increment and percentage has -1 value.

    {
        status: 0, // ALWAYS
        message: value, // String value
        isProgress: true    // ALWAYS 
        result: {
            increment: value,    // Decimal value
            percentage: value,    // Decimal value
        }
    }

## [**AH CLI Error Response**](#ah-cli-error-response)

When Aura Helper CLI throw any error when running commands, return a similar response to OK but with status value -1. 
    
    {
        status: -1, // ALWAYS
        code: 'ERROR_CODE_VALUE', // String value
        name: 'EXCEPTION_NAME',     // If the errors is produced by exception, has the name on this field.
        message: value, // String value
        result: {}
    }

# [**Ignore File**](#ignore-file)

The ignore file is a JSON file used on ignore and create package commands. On this file you can specify metadata types, objects and elements for ignore or delete from your local project or package files. You can have a main ignore file on your root project (like gitignore) named .ahignore.json for use automatically, or have different ignore files and specify it on the commands when you need tou use.

The ignore file have the next structure

    {
        // Basic structure
        "MetadataTypeAPIName": {
            "MetadataObject1",
            "MetadataObject2"
        }

        // Advance Structure
        "MetadataTypeAPIName": {
            "MetadataObject1:MetadataItem1",
            "MetadataObject1:MetadataItem2",
            "MetadataObject2:*",
            "*",
            "*:*" // Only valid on Custom Objects
        }

        // Special for Permissions
        "MetadataTypeAPIName": {
            "UserPermission:MetadataObject1:PermissionName",
            "UserPermission:MetadataObject2:*",
            "UserPermission:*:PermissionName"
        }
    }

*Example*:

    {
        "CustomLabels": {
            "labelName1",                   // Ignore or remove the custom label "labelName1"
            "labelName2",                   // Ignore or remove the custom label "labelName2",
            "*"                             // Ignore or remove all Custom Labels
        },
        "AssignmentRules":{
            "Case:Assign1",                 // Ignore or remove the Assignent Rule "Assign1" from the object Case
            "Lead:*",                       // Ignore or remove all Assignment Rules from Lead
            "*"                             // Ignore or remove all Assignment Rules
        },
        "CustomObject": {
            "Account",                      // Ignore or remove the Account Object
            "Case:*",                       // Ignore or remove all related objects from case, including the object (Bussines Process, Fields, Validation Rules...),
            "*",                            // Ignore or remove all custom objects (only the object not the related metadata)
            "*:*",                          // Ignore or remove all custom objects and the related metadata (Bussines Process, Fields, Validation Rules...)
        },
        "Report": {
            "ReportFolder",                 // Ignore or remove the entire folder
            "ReportFolder1:ReportName2",    // Ignore or remove the report "ReportName2" from "ReportFolder1" folder.
            "*",                            // Ignore or remove all reports.
        },
        "Workflow": {
            "Account",                      // Ignore or remove the Account worflows (Rules, Task, Alerts...)
            "*"                             // Ignore or  remove all workflows (Rules, Task, Alerts...) from all objects 
        },
        "WorkflowRule": {
            "Case:*",                       // Ignore or remove all Workflow rules from case object
            "Account:Rule1",                // Ignore or remove "Rule1" from Account workflows,
            "*"                             // Ignore or remove all Worflow rules from all objects
        },
        "Profile": {
            "UserPermission:*:Permission1", // Remove the "Permission1" User Permission from all profiles
            "UserPermission:TestProfile:*", // Remove all User permissions from TestProfile file
            "UserPermission:Admin:Perm1",   // Remove the Perm1 User Permission from Admin profile
            "TestProfile2",                 // Ignore or remove  the "TestProfile" profile 
            "*"                             // Ignore or remove all profiles
        }
    }

#### IMPORTANT

    Some Metadata Types have singular and plural name like CustomLabels, MatchingRules, EscalationRules... For ignore or remove this types you must use the plural name, if use the singular name the ignore process not take effect with this types.

---

# [**Metadata JSON Format**](#metadata-file)

The describe metadata commands and compare commands return the metadata in a JSON format, the same format for create the package througth a JSON file. This means that the output of the describe or compare commands can be used as input for create the package from JSON file. The next structure are the full JSON structure file:

    {
        "MetadataAPIName": {
            "name": "MetadataAPIName",                                  // Required. Contains the Metadata Type API Name (like object Key)
            "checked": false,                                           // Required. Field for include this type on package or not
            "path": "path/to/the/metadata/folder",                      // Optional. Path to the Metadata Type folder in local project
            "suffix": "fileSuffix",                                     // Optional. Metadata File suffix
            "childs": {                                                 // Object with a collection of childs (Field required but can be an empty object)
                "MetadataObjectName":{
                    "name": "MetadataObjectName",                       // Required. Contains the Metadata Object API Name (like object Key)
                    "checked": false,                                   // Required. Field for include this object on package or not
                    "path": "path/to/the/metadata/file/or/folder",      // Optional. Path to the object file or folder path
                    "childs": {                                         // Object with a collection of childs (Field required but can be an empty object)
                        "MetadataItemName": {
                            "name": "MetadataItemName",                   // Required. Contains the Metadata Item API Name (like object Key)
                            "checked": false,                           // Required. Field for include this object on package or not
                            "path": "path/to/the/metadata/file"
                        },
                        "MetadataItemName2": {
                            ...
                        },
                        ...,
                        ...,
                        ...
                    }
                }
                "MetadataObjectName2":{
                   ...
                },
                ...,
                ...,
                ...
            }
        }
    }


*Example*:

    {
        "CustomObject": {
            "name": "CustomObject",
            "checked": false,
            "path":  "path/to/root/project/force-app/main/default/objects",
            "suffix": "object",
            "childs": {
                "Account": {
                    "name": "Account",
                    "checked": true,            // Add Account Object to the package
                    "path": "path/to/root/project/force-app/main/default/objects/Account/Account.object-meta.xml",
                    "childs": {}
                },
                "Case": {
                    "name": "Case",
                    "checked": true,            // Add Case Object to the package
                    "path": "path/to/root/project/force-app/main/default/objects/Case/Case.object-meta.xml",
                    "childs": {}
                },
                ...,
                ...,
                ...
            }
        },
        "CustomField": {
            "name": "CustomField",
            "checked": false,
            "path":  "path/to/root/project/force-app/main/default/objects",
            "suffix": "field",
            "childs": {
                "Account": {
                    "name": "Account",
                    "checked": false,            
                    "path": "path/to/root/project/force-app/main/default/objects/Account/fields",
                    "childs": {
                        "customField__c": {
                            "name": "customField__c",
                            "checked": true,    // Add customField__c to the package
                            "path": "path/to/root/project/force-app/main/default/objects/Account/fields/customField__c.field-meta.xml",
                        },
                        ...,
                        ...,
                        ...
                    }
                },
                "Case": {
                    "name": "Case",
                    "checked": false,           
                    "path": "path/to/root/project/force-app/main/default/objects/Case/fields",
                    "childs": {
                        "CaseNumber": {
                            "name": "CaseNumber",
                            "checked": true,    // Add CaseNumber to the package
                            "path": "path/to/root/project/force-app/main/default/objects/Account/fields/CaseNumber.field-meta.xml",
                        },
                        ...,
                        ...,
                        ...
                    }
                },
                ...,
                ...,
                ...
            }
        }
    }



