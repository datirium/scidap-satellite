# Applied patches and known issues

1. Notarization:

    https://github.com/electron/electron-osx-sign/pull/169

2. Build lxml in cwl-airflow:

    ```
    git clone https://github.com/lxml/lxml
    python3.7 setup.py build --static-deps
    ```

3. Sign the binaries
   
   https://github.com/electron-userland/electron-builder/pull/5322/commits/209874e84e83940f30b7f33086c3e6d00177bf6a
   The problem is that `app-builder-lib/electron-osx-sign/util.js` ignores hidden and libs, etc.

4. For Ubuntu bundle had to patch `cwltool/sandboxjs.py` as it fails to evaluate JavaScript expressions when CWL-Airflow is run from PM2. Perhaps, it's somehow related to how PM2 starts the project. As a workaround, made `cwltool` always run JavaScript expression evaluation using Docker.

5. For Ubuntu bundle couldn't compile aria with `--with-openssl` even if openssl was installed. As a solution use builds from here https://github.com/q3aql/aria2-static-builds

6. PostgeSQL binaries are downloaded from https://www.enterprisedb.com/download-postgresql-binaries 

7. Docker seems to works slow even on `docker run`. Check if you have the following line in the `journalctl -u docker` log
    ```
    INFO[2021-01-03T12:21:16.363784091-05:00] No non-localhost DNS nameservers are left in resolv.conf. Using default external servers: [nameserver 8.8.8.8 nameserver 8.8.4.4]
    ```
    Check if you can ping either 8.8.8.8 or 8.8.4.4. If not, add dns configuration into your `/etc/docker/daemon.json` file the `/etc/resolv.conf` file similar to what is listed below.
    ```
    "dns": ["127.0.0.53", "8.8.8.8", "8.8.4.4"]
    ```
    More details can be found https://docs.docker.com/engine/install/linux-postinstall/#specify-dns-servers-for-docker and https://stackoverflow.com/a/39400887/8808721.
    Alternatively, test `docker run` with `--dns` param to see if DNS was the problem

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