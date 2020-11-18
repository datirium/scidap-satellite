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

## To build relocatable *tar.gz* that can be run with PM2 on any Ubuntu >= 18.04

On a virtual machine with Ubuntu 18.04 run the following commands. Use optional `.env` file to redefine default package versions.

```bash
sudo apt install git g++ make curl libssl-dev   # we need libssl-dev for aria if we use --with-openssl
curl https://install.meteor.com/ | sh
git clone https://github.com/datirium/scidap-satellite.git
cd ./scidap-satellite/build-scripts
./post_build_ubuntu.sh
```
