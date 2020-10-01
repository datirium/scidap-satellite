## Applied Patches

notarization:

https://github.com/electron/electron-osx-sign/pull/169


lxml in cwl-airflow:

```
 git clone https://github.com/lxml/lxml
 python3.7 setup.py build --static-deps
```
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

