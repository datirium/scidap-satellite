# Building SciDAP-Satellite bundle for Ubuntu/CentOS and macOS

## Ubuntu/CentOS

**To build** relocatable `tar.gz` that can be run on Ubuntu 18.04/20.04, CentOS 7/8, follow these directions.
- Make sure that Docker is installed and properly configured [see installation instructions](https://docs.docker.com/engine/install/ubuntu/)
- Clone [scidap-satellite](https://github.com/datirium/scidap-satellite) repository and switch to the branch/tag/commit you want to build from. Note, all local changes in the `build-scripts` directory will be included in the bundle.
   ```bash
   git clone https://github.com/datirium/scidap-satellite
   cd scidap-satellite
   ```
- Set `BITBUCKET_USER` and `BITBUCKET_PASS` environment variables to pull NJS-Client from [scidapSatelliteInteractions](https://bitbucket.org/datirium/scidapsatelliteinteractions/commits). Note, we do not build from the local *scidapSatelliteInteractions* repository.
- Enter directory with the build scripts and run `build_linux_in_docker.sh`
   ```bash
   cd build-scripts
   ./build_linux_in_docker.sh
   ```
   > By default Ubuntu 18.04 will be used as a building environment. Alternatively, you can provide other docker images, such as `ubuntu:18.04`, `ubuntu:20.04`, `centos:7`, or `centos:8` in the first argument of the script.

After script finishes running, you will find a compressed `scidap-satellite-commitsha-ubuntu.tar.gz` in the `./bundle` folder. All the temporary data will be kept in `./build` and can be removed.

**To run** relocatable `tar.gz` on Ubuntu 18.04/20.04, CentOS 7/8, follow these directions.
- Make sure that Docker is installed and properly configured [see installation instructions](https://docs.docker.com/engine/install/ubuntu/)
- Uncompress `scidap-satellite-commitsha-ubuntu.tar.gz` into an empty folder and start `pm2` with `./configs/ecosystem.config.js` file. See how to provide custom settings location at the end of this section.
  ```bash
  mkdir satellite
  mv scidap-satellite-commitsha-ubuntu.tar.gz satellite                  # initial location of scidap-satellite.tar.gz might be different
  cd satellite
  tar xzf scidap-satellite-commitsha-ubuntu.tar.gz
  ./pm2 start ./configs/ecosystem.config.js
  ```
**To test** relocatable `tar.gz` on Ubuntu 18.04/20.04, CentOS 7/8, follow these directions.
- Enter directory with the build scripts and run `test_linux_bundle.sh` with the absolute path to the `scidap-satellite-commitsha-ubuntu.tar.gz` and Docker image to run tests in (`ubuntu:18.04`, `ubuntu:20.04`, `centos:7`, or `centos:8`)
   ```bash
   cd build-scripts
   ./test_linux_bundle.sh /absolute/path/scidap-satellite-commitsha-ubuntu.tar.gz ubuntu:20.04
   ```
After script finishes running, you will find all logs in the `./temp` folder. The exit code can be checked with `echo $?`

Default configuration is saved in the `./configs/scidap_default_settings.json` file. Custom configuration can be loaded from the file set in `SCIDAP_SETTINGS` environment variable, `../scidap_settings.json` or `~/.config/scidap-satellite/scidap_settings.json`.

### Troubleshooting
1. When running on CentOS Aria2c complains about certificates, update settings to include path to the certificate file
   ```
    "aria2cSettings": {
        "--ca-certificate": "/etc/ssl/certs/ca-bundle.crt"
    }
   ```
2. This shouldn't happen anymore, but If `libssl.so.1.0.0` and/or `libcrypto.so.1.0.0` are not found, **report a bug**, and then download them from the provided links below and save into the folder from the `defaultLocations.airflow` field of the the settings file. Update `getAirflowEnvVar(settings)` function from `./utilities/configure.js` file to include `LD_LIBRARY_PATH: settings.defaultLocations.airflow`.
   https://scidap.nyc3.digitaloceanspaces.com/centos/libcrypto.so.1.0.0
   https://scidap.nyc3.digitaloceanspaces.com/centos/libssl.so.1.0.0 
3. Aria2c fails to download files with ExitCode 8. The possible reason for this issue to appear is not being able to resume not finished download when proxy doesn’t support download resume. For more details about this issue and how to check whether your proxy supports download resume, see [Problem with Aria2c running behind the proxy](https://datirium.atlassian.net/wiki/spaces/SDP/pages/1122566148/Known+configuration+issues#Problem-with-Aria2c-running-behind-the-proxy).
4. To manually replace CWL-Airflow in the already installed SciDAP Satellite bundle for Ubuntu/CentOS, download the required version of packed for Linux CWL-Airflow from the correspondent release, for example, from [v1.2.11](https://github.com/Barski-lab/cwl-airflow/releases/download/1.2.11/python_3.8.12_cwl_airflow_master_linux.tar.gz), extract it, and replace the content of cwl-airflow directory of your satellite bundle with the content of just extracted python3 directory.
## macOS

**To build** Electron App on macOS follow these directions.
- Install required dependencies.
  ```bash
  brew install git
  brew install node@12
  npm install -g @nestjs/cli
  ```
- Clone `scidap-satellite` repository. Install node modules.
   ```bash
   git clone https://github.com/datirium/scidap-satellite.git
   cd scidap-satellite
   npm install
   ```
- Create a text file `.env` in the `./build-scripts` folder. Add there either `NJS_CLIENT_LOCAL_PATH` to build `scidapSatelliteInteractions` from the local repository, or a pair of `BITBUCKET_USER` and `BITBUCKET_PASS` variables to clone it from Bitbucket.  `NJS_CLIENT_LOCAL_PATH` should point to the `scidap-satellite` subdir as we don't need to build `apisync`. Optionally, the default programs versions used in the script can be redefined in `.env` file.
- Run `build_macos.sh` script inside the `./build-scripts` folder. Pack results into App. Use `electron:mac:prod` or `electron:mac:dev` depending on whether you want to connect to `https://api.scidap.com/` or `https://api-dev.scidap.com/`.
   ```bash
   cd ./build-scripts
   ./build_macos.sh
   cd ..
   npm run electron:mac:prod   # or electron:mac:dev for dev version
   ```
After script finishes running, you will find a `scidap-satellite.app` in `./release/mac` folder. All the temporary data is kept in `../build` folder and can be removed unless you want to save some time when rerunning `build_macos.sh` script next time. When component versions are updated, remove `../build` folder. `Services` folder is used to save all necessary files before assembling application. This folder is cleaned on each `build_macos.sh` run.

**To run** Electron App on macOS with installed and configured Docker right-click on `scidap-satellite.app` and select `Open`.

In case you by mistake run `build_ubuntu.sh` script, you will need to remove `node_modules`, `build`, `build_ubuntu`, `Services`, `ubuntu_post_build` folders in the root of you repository and rerun `npm install`, `build_macos.sh` and `npm run electron:mac` commands as it's listed above.

The default configuration file from `./configs/scidap_default_settings.json` will be used by Electron for generating `config.json`.


## Building CLUSTER sat (locally)

run 

```bash
./build_sripts/build_linux_CLUSTER_in_docker.sh /abs/path/to/cluster/repo /abs/path/to/njs/repo DOCKER_IMAGE_NAME sat.new.version
# 6 more optional params with defaults
```

> NOTE: the docker image should be ubuntu base, but requires python with shiv installed
A dockerfile to use as a basis is also included, and can be built with ```docker build --tag "SOME_TAG" - < linux_cluster.dockerfile```

## Default configuration

- `defaultLocations.airflow` and `defaultLocations.pgdata` define the locations for airflow configuration and PostreSQL database files correspondingly. If they are set as relative paths, they by default will be resolved based on the `satelliteSettings.systemRoot`. However, for macOS bundle if `satelliteSettings.systemRoot` was changed from the **Satellite data directory** parameter in the **Common** settings tab, the `defaultLocations.airflow` and `defaultLocations.pgdata` won't be re-evaluated.
- `satelliteSettings` section is mainly used by NJS-Client. On macOS `rcServerToken` shouldn't be set, as it will be read from Keychain. `systemRoot` defines the location where all analyses data will be saved. If it's set as a relative path, it will be resolved based on the user's home directory. The `remotes` section includes `localfiles` field with `show` set to `false` by default. This tells NJS-Client to disable access from UI to the local directories set as the `collection` items. If `show` set to `true` all relative `path` will be resolved based on the `satelliteSettings.systemRoot` value.
- all parameters from `airflowSettings` section will be applied to `airflow scheduler` and `cwl-airflow api`. It may include any valid parameter from `airflow.cfg` in a form of `"section__parameter": "value"`.
- all parameters from `aria2cSettings` section will be applied to `aria2c`. It may include any valid for Aria2c argument in a form of `"--flag": "value"`. Note, as it was described here [Problem with Aria2c running behind the proxy](https://datirium.atlassian.net/wiki/spaces/SDP/pages/1122566148/Known+configuration+issues#Problem-with-Aria2c-running-behind-the-proxy), when running behind proxy that doesn’t support download resume, at least the "--proxy-method": "tunnel" settings should be added. 
- `databaseSettings` section defines parameters for the running PostgreSQL database, that is always bound to `127.0.0.1` so it's safe keep default values unless additional security measures needed.
- `devel` section defines parameters used during developing. Currently, it includes only `simulation` and `mac_update_from_devel` parameters. The former allows to shortcut CWL-Airflow API without triggering any DAGs. The latter makes macOS build to check for the developers updates (different location on our DigitalOcean).


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
            },
            "localfiles": {
                "show": false,
                "collection": [
                    {
                        "path": "upload",
                        "name": "localfiles"
                    }
                ]
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