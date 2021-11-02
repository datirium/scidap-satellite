## 2.0.5 (2021-11-02)

* Bug fixes and copying files from localfile location
## 2.0.4 (2021-09-21)

* file manager updated with local files fixes
* cwl-airflow updated to 1.2.11
## 2.0.3 (2020-06-25)

* fix bug with not deleted `scidapRoot`. Need to delete it as after each update `systemRoot`
  can be mistakenly restored from it. Depending on the use case, check if `scidapRoot` need to be
  manually deleted before update to 2.0.3 (if we want to set the default value for `systemRoot`)
* remove deprecated settings: `baseUrl`, `triggerDag`

## 2.0.2 (2020-04-27)

* use the latest NJS-Client version (d52c369707ca) with FTP proxy support and other bug fixes

## 2.0.1 (2020-04-26)

* reuse old `scidapRoot` when setting the default value for `systemRoot` (no need to manually configure it when updating from the old version)
* use the latest NJS-Client version (d95b11f29ed5) with configurable port for aria2.js
* Move `pgdata` to `~/Library/Application Support/scidap-satellite` as there is no need to keep it alongside `projects` folder

## 2.0.0 (2020-04-20)

* BioWardrobe-NG is replaced by NJS-Client
* no need in mongoDB anymore
* LDAP authentication is outsourced to refactored [BioWardrobe-NG](https://github.com/Barski-lab/biowardrobe-ng)

## 1.0.7 (2020-08-05)

* fastq-dump mac os fix case sensitivity

## 1.0.6 (2020-03-28)

* biowardrobeNG (1.1.3) - download aria2c progress
* new cwl-airflow 1.1.12 (cwltool==2.0.20200224214940 and airflow==1.10.9)
* node 12.16.3
* bump electron version

## 1.0.5 (2019-11-12)

* biowardrobeNG (1.1.1)

## 1.0.4 (2019-11-11)

* fastq-dump - 2.9.6
* node pre 10.17.1 - 2GB file limit (https://github.com/nodejs/node/issues/30085#issuecomment-547668130)
* downloads - restart - biowardrobeNG (1.1.0)
* aria2c - 1.35 with --auto-file-renaming=false

## 1.0.2 (2019-10-26)

* pm2 version bumped 4
* angular & clarity bumped


## <small>1.0.0 (2019-10-10)</small>

* Initial release


