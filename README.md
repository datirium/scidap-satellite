## Applied Patches

notarization:

https://github.com/electron/electron-osx-sign/pull/169


lxml in cwl-airflow:

```
 git clone https://github.com/lxml/lxml
 python3.7 setup.py build --static-deps
```

The most annoying patch is to sign the binaries https://github.com/electron-userland/electron-builder/pull/5322/commits/209874e84e83940f30b7f33086c3e6d00177bf6a, problem that `app-builder-lib/electron-osx-sign/util.js` ignores hidden and libs, etc.


## Boilerplate

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

## Relocatable **tar.gz** for Ubuntu >= 18.04

To build relocatable `tar.gz` that can be run with PM2 on any Ubuntu >= 18.04 start clean virtual machine with Ubuntu 18.04
and run the following commands. To redefine default program versions used in a script, provide an optional `.env` file in the same folder as `build_ubuntu.sh` script.

```bash
sudo apt-get install git g++ make curl libssl-dev pkg-config   # we need libssl-dev and pkg-config for aria2c to be compiled --with-openssl
curl https://install.meteor.com/ | sh                          # installing meteor with its own node for building BioWardrobe-NG
git clone https://github.com/datirium/scidap-satellite.git
cd ./scidap-satellite/
git checkout ubuntu_packaging                                  # this can be skipped when PR is merged
git pull origin ubuntu_packaging                               # this can be skipped when PR is merged
cd ./build-scripts/ubuntu/
./build_ubuntu.sh
```

After script finished running, you will find a compressed `scidap-satellite.tar.gz` in the `../ubuntu_post_build` folder. All the temporary data is kept in `../build` and can be removed unless you want to save some time when rerunning `build_ubuntu.sh` script.

To run relocatable `scidap-satellite.tar.gz` on clean Ubuntu >= 18.04 use the following commands
```bash
sudo apt-get install git nodejs npm curl              # mongod doesn't work without curl
mkdir satellite
mv scidap-satellite.tar.gz satellite                  # initial location of scidap-satellite.tar.gz might be different
cd satellite
tar xzf scidap-satellite.tar.gz
npm install pm2                                       # you can also install pm2 globally
                                                      # update ecosystem.config.js based on the recommendation below  
./node_modules/pm2/bin/pm2 start ecosystem.config.js  # start ecosystem.config.js with PM2
```

The following parameters from `ecosystem.config.js` file can be updated

```js
const rc_server_token = ""
const satelliteSettings = {
  'port': 3069,
  'scidapRoot': path.join(os.homedir(), 'scidap'),
  'scidapSSLPort': 3070,
  'airflowAPIPort': 8080,
  'aria2cPort': 6800,
  'mongoPort': 27017,
  'pm2Port': 9615,
  'baseUrl': 'http://localhost:3069/',
  'sslCert': '',
  'sslKey': '',
  'triggerDag': 'http://127.0.0.1:8080/api/experimental/dags/{dag_id}/dag_runs',
  'localFiles': true
}
const airflowSettings = { 
  'core.dag_concurrency': 2,
  'core.dags_are_paused_at_creation': 'False',
  'core.load_examples': 'False',
  'core.max_active_runs_per_dag': 1
}
```