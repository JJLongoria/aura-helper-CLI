# Aura Helper CLI
Command Line Interface for work with Salesforce Projects and Support Aura Helper Plugin for VSCode. Have powerfull commands for manage and work on your projects. Aura Helper CLI requires [SFDX CLI](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_install_cli.htm) for work.

---

## [**Installation Guide**](#installation-guide)
### [NPM Installation (Recommended)](#windows-installation)
If you have installed NodeJS on yort system and NPM, run:

    npm install -g aura-helper

This method is recommended because you don't need root permissions and have better support for maintance updated Aura Helper CLI because have the NPM support.

### [Windows Installation](#windows-installation)
For install Aura Helper CLI on Windows systems without NPM, [click here]() for download a simple cmd installer (Installer will be install Aura Helper CLI on: `%HOME%/%USER_FOLDER%/.aura-helper`). If you want to install on a custom folder, [click here]() for downdload the binary and add it to your Windows path.

### [Linux Installation](#linux-installation)
For install Aura Helper CLI on Linux systems without NPM, [click here]() for download the linux Aura Helper CLI binary, and copy it on `/usr/local/bin`. It's possible that you should to change the file attributes for make it executable. For it run: 

    chmod +x aura-helper

---

## [**Usage**](#usage)
Aura Helper commands have the next structure: `aura-helper <command:name> [command:input] [options]`

### [Help](#help)
If you need help with Aura Helper CLI, you can run:

    aura-helper --help or aura-helper -h

### [Metadata Commands](#metadata-commands)
Metadata commands are the commands for work with your metadata files. You can compress xml files, list or describe metadata types that you have on your org or in your local project. Can compare local and org metadata or ignore some metadata types according ahignore.json file (see [Ignore File](#ignore-file) section). Also you can repair project metadata dependencies.

- **metadata:local:compress** - Command for compress XML files for ocuppy less data storage, and make more usefull with SVC systems like Git. With XML Files compressed, the file confilcts on merges are to much easy to resolve.

    *Options*:

        -r | --root <path/to/project/root>      Path to project root. By default is your current folder.
        -a | --all                              Compress all XML files with support compression in your project.
        -d | --directory <path/to/directory>    Compress XML Files from specific directory. This options does not take effect if you choose compress all.
        -f | --file <path/to/file>              Compress the specified XML file. This options does not take effect if you choose compress directory or all.ç
    
    *Examples*:

    Compress All XML metadata files on your salesforce project:

        aura-helper metadata:local:compress -a

    Compress All XML Files for objects folder (and subfolders):

        aura-helper metadata:local:compress -d force-app/main/default/objects

    Compress Account XML File:

        aura-helper metadata:local:compress -f force-app/main/default/objects/Account/Account.object-meta-xml

- **metadata:local:ignore** - Command for ignore some metadata types. If you use git or other SVC systems, you can construct a .gitignore file or similar for ignore some files from your SVC. But salesforce have some metadata that can't ignore with git because have into other files, like custom labels, workflows or user permissios for example. This command allow to you to ignore this types of metadata.

- **metadata:local:list** - Command for list all Metadata Types stored in your local project. 

- **metadata:local:describe** - Command for describe all or specific Metadata Types like Custom Objects, Custom Fields, Apex Classes... that you have in your local project.

- **metadata:local:repair** - Command for repair your local project like Metadata Files and Metadata Types dependencies.

- **metadata:org:list** - Command for list all Metadata Types stored in your auth org

- **metadata:org:describe** - Command for describe all or specific Metadata Types likes Custom Objects, Custom Fields, Apex Classes... that you have in your auth org

- **metadata:org:compare** - Command for compare your local project with yout auth org for get the differences. The result are the metadata types and objects that you have in your org, but don't have in your local project.


### [Core Commands](#core-commands)

- **update** - Command for update Aura Helper CLI to the latest version if are installed without NPM. With npm run:
    
    npm update -g aura-helper

### [Ignore File](#ignore-file)






