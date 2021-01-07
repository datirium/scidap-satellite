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


# Building relocatable tar.gz and App

## Ubuntu

To build relocatable `tar.gz` that can be run with PM2 on Ubuntu 18.04, start clean virtual machine with Ubuntu 18.04 and run the following commands. Optionally, the default programs versions used in the script can be redefined in `.env` file provided in the same folder as `build_ubuntu.sh` script.

```bash
sudo apt-get install git g++ make curl
curl https://install.meteor.com/ | sh                          # installing meteor with its own node for building BioWardrobe-NG
git clone https://github.com/datirium/scidap-satellite.git
cd ./scidap-satellite/build-scripts
./build_ubuntu.sh
```

After script finishes running, you will find a compressed `scidap-satellite.tar.gz` in the `../ubuntu_post_build` folder. All the temporary data is kept in `../build_ubuntu` and can be removed unless you want to save some time when rerunning `build_ubuntu.sh` script next time.

To run relocatable `scidap-satellite.tar.gz` on clean Ubuntu 18.04 with installed and configured Docker use the following commands.
```bash
sudo apt-get install git nodejs npm curl              # mongod doesn't work without curl
mkdir satellite
mv scidap-satellite.tar.gz satellite                  # initial location of scidap-satellite.tar.gz might be different
cd satellite
tar xzf scidap-satellite.tar.gz
npm install pm2
./node_modules/pm2/bin/pm2 start ./configs/ecosystem.config.js  # start ecosystem.config.js with PM2
```

Default configuration is saved in the `./configs/scidap_default_settings.json` file. Custom configuration can be loaded from the file set in `SCIDAP_SETTINGS` environment variable, `../scidap_settings.json` or `~/.config/scidap-satellite/scidap_settings.json`.

```yaml
{
    "defaultLocations": {
        "files": "files",
        "mongodb": "mongodb",
        "airflow": "airflow",
        "satellite": "satellite",
        "pgdata": "pgdata"
    },
    "satelliteSettings": {
        "rcServerToken": "",
        "rcServer": "https://api-sync.scidap.com",
        "port": 3069,
        "scidapRoot": "./scidap",
        "airflowAPIPort": 8080,
        "aria2cPort": 6800,
        "mongoPort": 27017,
        "mongoCollection": "scidap-satellite",
        "baseUrl": "http://localhost:3069/",
        "scidapSSLPort": 3070,
        "sslCert": "",
        "sslKey": "",
        "localFiles": true,
        "proxy": "",
        "noProxy": ""
    },
    "airflowSettings": {
        "core.executor": "LocalExecutor",
        "core.dag_concurrency": 2,
        "core.dags_are_paused_at_creation": "False",
        "core.load_examples": "False",
        "core.max_active_runs_per_dag": 1
    },
    "aria2cSettings": {
        "--console-log-level": "debug",
        "--remove-control-file": true,
        "--allow-overwrite": true,
        "--auto-file-renaming": false
    },
    "databaseSettings": {
        "db_port": 5432,
        "db_user": "airflow",
        "db_password": "airflow",
        "db_name": "airflow"
    },
    "meteorSettings": {
        "logLevel": "debug",
        "cors_package": true,
        "email": {
            "url": "",
            "from": ""
        },
        "extra_users": [],
        "public": {
        },
        "accounts": {
            "sendVerificationEmail": true,
            "forbidClientAccountCreation": true,
            "loginExpirationInDays": 7
        },
        "ldap": {},
        "oauth2server": {},
        "remotes": {
            "postform": {
                "collection": {},
                "publication": "none"
            },
            "directurl": {
                "caption": "Direct URL",
                "type": "urls",
                "protocol": [
                    "https",
                    "http",
                    "ftp"
                ],
                "refreshSessionInterval": 180
            },
            "geo": {
                "caption": "GEO",
                "type": "urls",
                "protocol": [
                    "geo"
                ],
                "refreshSessionInterval": 180
            }
        }
    }
}
```

## macOS
To build relocatable App on macOS with preinstalled `meteor`, `node` and `git` run the following commands. Optionally, the default programs versions used in the script can be redefined in `.env` file provided in the same folder as `build_macos.sh` script.

```bash
git clone https://github.com/datirium/scidap-satellite.git
cd ./scidap-satellite
npm install
cd ./build-scripts
./build_macos.sh
cd ..
npm run electron:mac
```

After script finishes running, you will find a `scidap-satellite.app` in `./release/mac` folder. All the temporary data is kept in `../build` folder and can be removed unless you want to save some time when rerunning `build_macos.sh` script next time. `Services` folder is used to save all necessary files before assembling application. This folder is cleaned on each `build_macos.sh` run.

In case you by mistake run `build_ubuntu.sh` script, you will need to remove `node_modules`, `build`, `build_ubuntu`, `Services`, `ubuntu_post_build` folders in the root of you repository and rerun `npm install`, `build_macos.sh` and `npm run electron:mac` commands as it's listed above.

The default configuration file `./configs/scidap_default_settings.json` will be used by Electron for generating `config.json`.

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