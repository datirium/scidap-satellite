# Applied Patches

notarization:

https://github.com/electron/electron-osx-sign/pull/169


lxml in cwl-airflow:

```
 git clone https://github.com/lxml/lxml
 python3.7 setup.py build --static-deps
```

The most annoying patch is to sign the binaries https://github.com/electron-userland/electron-builder/pull/5322/commits/209874e84e83940f30b7f33086c3e6d00177bf6a, problem that `app-builder-lib/electron-osx-sign/util.js` ignores hidden and libs, etc.


# Boilerplate

Clone this repository locally :

``` bash
git clone https://github.com/maximegris/angular-electron.git
```

Install dependencies with npm :

``` bash
npm install
```

There is an issue with `yarn` and `node_modules` that are only used in electron on the backend when the application is built by the packager. Please use `npm` as dependencies manager.


If you want to generate Angular components with Angular-cli , you **MUST** install `@angular/cli` in npm global context.
Please follow [Angular-cli documentation](https://github.com/angular/angular-cli) if you had installed a previous version of `angular-cli`.

``` bash
npm install -g @angular/cli
```


# Building SciDAP-Satellite bundle for Ubuntu and macOS

## Ubuntu

**To build** relocatable `tar.gz` that can be run with PM2 on Ubuntu 18.04, follow these directions.
- Start a clean virtual machine with Ubuntu 18.04. Install required dependencies.
   ```bash
   sudo apt-get install git g++ make curl
   curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -    # to get Node 12.X and npm
   sudo apt-get install nodejs
   mkdir ~/.npm-global                                                # to avoid permission problems with npm
   npm config set prefix '~/.npm-global'
   export PATH=~/.npm-global/bin:$PATH
   npm install -g @nestjs/cli@7.6.0
   ```
- Clone `scidap-satellite` repository and switch to the `master` branch.
   ```bash
   git clone https://github.com/datirium/scidap-satellite.git
   cd scidap-satellite && git checkout master
   ```
- Create a text file `.env` in the `./build-scripts` folder. Add there either `NJS_CLIENT_LOCAL_PATH` to build `scidapSatelliteInteractions` from the local repository, or a pair of `BITBUCKET_USER` and `BITBUCKET_PASS` variables to clone it from Bitbucket.  `NJS_CLIENT_LOCAL_PATH` should point to the `scidap-satellite` subdir as we don't need to build `apisync`. Optionally, the default programs versions used in the script can be redefined in `.env` file.
- Run `build_ubuntu.sh` script inside the `./build-scripts` folder.
   ```bash
   cd ./build-scripts
   ./build_ubuntu.sh
   ```

After script finishes running, you will find a compressed `scidap-satellite.tar.gz` in the `../ubuntu_post_build` folder. All the temporary data is kept in `../build_ubuntu` and can be removed unless you want to save some time when rerunning `build_ubuntu.sh` script next time. When component versions are updated, remove `../build_ubuntu` folder.

**To run** relocatable `tar.gz` with PM2 on Ubuntu 18.04, follow these directions.
- Make sure that Docker is installed and properly configured [see installation instructions](https://docs.docker.com/engine/install/ubuntu/)
- Install required dependencies.
   ```bash
   sudo apt-get install git g++ make curl
   curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -    # to get Node 12.X and npm
   sudo apt-get install nodejs
   ```
- Uncompress `scidap-satellite.tar.gz` into an empty folder. Install `pm2` and start it with `ecosystem.config.js`. See how to provide custom location for the configuration file below.
  ```bash
  mkdir satellite
  mv scidap-satellite.tar.gz satellite                  # initial location of scidap-satellite.tar.gz might be different
  cd satellite
  tar xzf scidap-satellite.tar.gz
  npm install pm2
  ./node_modules/pm2/bin/pm2 start ./configs/ecosystem.config.js  # start ecosystem.config.js with PM2
  ```

Default configuration is saved in the `./configs/scidap_default_settings.json` file. Custom configuration can be loaded from the file set in `SCIDAP_SETTINGS` environment variable, `../scidap_settings.json` or `~/.config/scidap-satellite/scidap_settings.json`.

## macOS

**To build** Electron App on macOS follow these directions.
- Install required dependencies.
  ```bash
  brew install git
  brew install node@12
  npm install -g @nestjs/cli@7.6.0
  ```
- Clone `scidap-satellite` repository and switch to the `master` branch. Install node modules.
   ```bash
   git clone https://github.com/datirium/scidap-satellite.git
   cd scidap-satellite && git checkout master
   npm install
   ```
- Create a text file `.env` in the `./build-scripts` folder. Add there either `NJS_CLIENT_LOCAL_PATH` to build `scidapSatelliteInteractions` from the local repository, or a pair of `BITBUCKET_USER` and `BITBUCKET_PASS` variables to clone it from Bitbucket.  `NJS_CLIENT_LOCAL_PATH` should point to the `scidap-satellite` subdir as we don't need to build `apisync`. Optionally, the default programs versions used in the script can be redefined in `.env` file.
- Run `build_macos.sh` script inside the `./build-scripts` folder. Pack results into App. Use `electron:mac:prod` or `electron:mac:dev` depending on whether you want to connect to `https://api.scidap.com/` or `https://api-dev.scidap.com/`.
   ```bash
   cd ./build-scripts
   ./build_macos.sh
   cd ..
   npm run electron:mac:prod
   ```
After script finishes running, you will find a `scidap-satellite.app` in `./release/mac` folder. All the temporary data is kept in `../build` folder and can be removed unless you want to save some time when rerunning `build_macos.sh` script next time. When component versions are updated, remove `../build` folder. `Services` folder is used to save all necessary files before assembling application. This folder is cleaned on each `build_macos.sh` run.

**To run** Electron App on macOS with installed and configured Docker right-click on `scidap-satellite.app` and select `Open`.

In case you by mistake run `build_ubuntu.sh` script, you will need to remove `node_modules`, `build`, `build_ubuntu`, `Services`, `ubuntu_post_build` folders in the root of you repository and rerun `npm install`, `build_macos.sh` and `npm run electron:mac` commands as it's listed above.

The default configuration file from `./configs/scidap_default_settings.json` will be used by Electron for generating `config.json`.

## Default configuration

- `defaultLocations.airflow` and `defaultLocations.pgdata` define the locations for airflow configuration and PostreSQL database files correspondingly. If they are set as relative paths, they by default will be resolved based on the `satelliteSettings.systemRoot`. However, for macOS bundle if `satelliteSettings.systemRoot` was changed from the **Satellite data directory** parameter in the **Common** settings tab, the `defaultLocations.airflow` and `defaultLocations.pgdata` won't be re-evaluated. If needed they can be configured independently using two separate parameters **Airflow data directory** and **Database data directory** in the **Advanced** settings tab, as the user might need to change the location only for his analyses data (on a external hard-drive, etc) while keeping the whole system run on the same machine with the same configurations.
- `satelliteSettings` section is mainly used by NJS-Client. On macOS `rcServerToken` shouldn't be set, as it will be read from Keychain. `systemRoot` defines the location where all analyses data will be saved. If it's set as a relative path, it will be resolved based on the user's home directory.
- all parameters from `airflowSettings` section will be applied to `airflow scheduler` and `cwl-airflow api`. It may include any valid parameter from `airflow.cfg` in a form of `"section.parameter": "value"`.
- all parameters from `aria2cSettings` section will be applied to `aria2c`. It may include any valid for Aria2c argument in a form of `"--flag": "value"`.
- `databaseSettings` section defines parameters for the running PostgreSQL database, that is always bound to `127.0.0.1` so it's safe keep default values unless additional security measures needed.
- `devel` section defines parameters used during developing. Currently, it includes only `simulation` parameter, which allows to shortcut CWL-Airflow API without triggering any DAGs.


```yaml
{
    "defaultLocations": {
        "airflow": "airflow",
        "pgdata": "pgdata"
    },
    "satelliteSettings": {
        "rcServerToken": "",
        "rcServer": "dev.scidap.com:8080",
        "port": 3069,
        "airflowAPIPort": 8080,
        "systemRoot": "./scidap",
        "aria2cPort": 6800,
        "pm2Port": 9615,
        "enableSSL": true,
        "localFiles": true,
        "proxy": "",
        "noProxy": "",
        "remotes": {
            "directurl": {
                "protocol": [
                    "ftp",
                    "http",
                    "https"
                ],
                "caption": "ftp"
            },
            "geo": {
                "protocol": "geo",
                "caption": "geo"
            }
        }
    },
    "airflowSettings": {
        "core__executor": "LocalExecutor",
        "core__parallelism": 1,
        "core__dag_concurrency": 1,
        "core__max_active_runs_per_dag": 1,
        "core__hostname_callable": "socket.gethostname"
    },
    "aria2cSettings": {
        "--console-log-level": "debug",
        "--remove-control-file": true,
        "--allow-overwrite": true,
        "--auto-file-renaming": false
    },
    "databaseSettings":{
        "db_port": 5432,
        "db_user": "airflow",
        "db_password": "airflow",
        "db_name": "airflow"
    },
    "devel":{
        "simulation": false,
        "mac_update_from_devel": false
    }
}
```

_____
## Notes for developers

**Applied patches and used binaries**

1. For Ubuntu bundle had to patch `cwltool/sandboxjs.py` as it fails to evaluate JavaScript expressions when CWL-Airflow is run from PM2. Perhaps, it's somehow related to how PM2 starts the project. As a workaround, made `cwltool` always run JavaScript expression evaluation using Docker.
2. Couldn't compile aria with `--with-openssl` even if openssl was installed. As a solution use builds from here https://github.com/q3aql/aria2-static-builds
3. PostgeSQL binaries are downloaded from https://www.enterprisedb.com/download-postgresql-binaries 

**Upgrading from the old Ubuntu satellite installation**
1. Stop services
```bash
systemctl stop airflow-apiserver
systemctl stop airflow-scheduler
systemctl stop airflow-webserver
systemctl stop aria2c
systemctl stop scidap-satellite
```
2. Create dump from the current MongoDB and stop `mongodb` service
```
mongodump
systemctl stop mongodb
```
3. Start only `mongod` using PM2 `--only` parameter and restore database from the the dump
```
pm2 start ecosystem.config.js --only mongod
mongorestore
```
4. Start all services using PM2
5. After update (both for Ubuntu and macOS) you might need to force SciDAP-UI push new CWL to the Satellite. For that remove `CWL` field from the `sync` object of the correspondent document in the `Satellites` collection. **Do not** remove other fields as that will cause samples to rerun.

**Known issues on Ubuntu**
1. Can't find Node's modules
```export NODE_PATH="'$(npm root)'"```
or
```export NODE_PATH="'$(npm root -g)'"```
2. Can't start `airflow-scheduler` or `airflow-apiserver` services
    Make sure you don't have `~/.local` with python packages installed, especially with `cwl-airflow`. Quick solution - just rename it. Even if we set PYTHONPATH, it will still try to search in the standard python module locations.
3. Docker seems to works slow even on `docker run`. Check if you have the following line in the `journalctl -u docker` log
    ```
    INFO[2021-01-03T12:21:16.363784091-05:00] No non-localhost DNS nameservers are left in resolv.conf. Using default external servers: [nameserver 8.8.8.8 nameserver 8.8.4.4]
    ```
    Check if you can ping either 8.8.8.8 or 8.8.4.4. If not, add dns configuration into your `/etc/docker/daemon.json` file the `/etc/resolv.conf` file similar to what is listed below.
    ```
    "dns": ["127.0.0.53", "8.8.8.8", "8.8.4.4"]
    ```
    More details can be found https://docs.docker.com/engine/install/linux-postinstall/#specify-dns-servers-for-docker and https://stackoverflow.com/a/39400887/8808721
    Alternatively, test `docker run` with `--dns` param to see if DNS was the problem

**Known issues on macOS**
1. Updating `Satellite data directory` and `Enable local files module` from the `Settings` won't make any effect (need to be properly implemented).