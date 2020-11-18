// This file should be placed into the Services folder

// script should be absolue path, otherwise it will be resolved
// relative to the directory where pm2 start was run

var path = require('path');
var fs = require('fs');


function getAria2cArgs(satelliteSettings){
  const aria2cArgs = [
    '--enable-rpc',
    '--rpc-listen-all=false',
    `--rpc-listen-port=${satelliteSettings.aria2cPort}`,
    '--console-log-level=debug',
    '--auto-file-renaming=false'
  ];  
  if (satelliteSettings && satelliteSettings.proxy) {
    aria2cArgs.push(`--all-proxy=${satelliteSettings.proxy}`);
  };
  return aria2cArgs
}


function getMongodArgs(satelliteSettings){
  const mongodArgs = [
    '--bind_ip=127.0.0.1',
    `--port=${satelliteSettings.mongoPort}`,
    `--dbpath=${satelliteSettings.scidapRoot}/mongodb`
  ];
  return mongodArgs
}


function getAirflowEnvVar(pathEnvVar, airflowSettings){
  const airflowEnvVar = {
    PATH: pathEnvVar,
    AIRFLOW_HOME: airflowSettings.AIRFLOW_HOME,
    LC_ALL: 'en_US.UTF-8',
    LANG: 'en_US.UTF-8'
  };
  return airflowEnvVar
}


function getAirflowApiServerArgs(satelliteSettings){
  const airflowApiServerArgs = [
    'api',
    `--port=${satelliteSettings.airflowAPIPort}`
  ];
  return airflowApiServerArgs
}


function getMeteorSettings(meteorDefaultSettingsJson, satelliteSettings, airflowSettings, rc_server_token){
  const meteorDefaultSettings = JSON.parse(fs.readFileSync(meteorDefaultSettingsJson));
  const meteorSettings = {
      ...meteorDefaultSettings,
      base_url: satelliteSettings.baseUrl,
      rc_server_token: rc_server_token,
      systemRoot: satelliteSettings.scidapRoot,
      airflow: {
          trigger_dag: satelliteSettings.triggerDag,
          dags_folder: `${airflowSettings.AIRFLOW_HOME}/dags/`                // won't work if airflow.cfg was updated manually
      },
      logFile: `${airflowSettings.AIRFLOW_HOME}/../satellite-service.log`,    // maybe we can find better place for this
  };
  if (satelliteSettings.sslCert && satelliteSettings.sslKey && satelliteSettings.scidapSSLPort) {
      meteorSettings['SSL'] = {
          'key': satelliteSettings.sslKey,
          'cert': satelliteSettings.sslCert,
          'port': satelliteSettings.scidapSSLPort
      };
  }
  if (satelliteSettings.localFiles) {
      meteorSettings.remotes.localfiles = {
          ...meteorSettings.remotes.localfiles,
          base_directory: `${satelliteSettings.scidapRoot}/files`
      };
  } else {
      meteorSettings.remotes.localfiles = {
          collection: {},
          publication: 'none'
      };
  }
  return meteorSettings;
}


function getSatelliteEnvVar(pathEnvVar, meteorDefaultSettingsJson, satelliteSettings, airflowSettings, rc_server_token){
  let satelliteEnvVar = {
    PATH: pathEnvVar,
    MONGO_URL: `mongodb://localhost:${satelliteSettings.mongoPort}/scidap-satellite`,
    ROOT_URL: satelliteSettings.baseUrl,
    PORT: satelliteSettings.port,
    METEOR_SETTINGS: getMeteorSettings(meteorDefaultSettingsJson, satelliteSettings, airflowSettings, rc_server_token),
    NODE_OPTIONS: '--trace-warnings --pending-deprecation'
  };
  if (satelliteSettings && satelliteSettings.proxy) {
    satelliteEnvVar = {
      ...satelliteEnvVar,
      https_proxy: satelliteSettings.proxy,
      http_proxy: satelliteSettings.proxy,
      no_proxy: satelliteSettings.noProxy || ''
    };
  };
  return satelliteEnvVar
}


// variables that depend on the script location and should be initiated on every run
const satelliteBin = path.join(__dirname, './satellite/bin');
const cwlAirflowBin = path.join(__dirname, './cwl-airflow/bin');
const pathEnvVar = `${satelliteBin}:${cwlAirflowBin}:/usr/bin:/bin:/usr/local/bin`
const meteorDefaultSettingsJson = path.join(__dirname, 'meteor_default_settings.json');

// variables that should be kept secret
const rc_server_token = ""

// variables that can be set in the separate configuration file
const satelliteSettings = {
  'port': 3069,
  'scidapRoot': '/Users/tester/scidap',
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
  'AIRFLOW_HOME': '/Users/tester/Library/Application Support/scidap-satellite/airflow'
}


// we don't want to keep init_commands in airflowSettings as they depend on satelliteSettings

// Add something that will run all airflow initdb, etc


module.exports = {
  apps : [
    {
      name: 'aria2c',
      script: `${satelliteBin}/aria2c`,
      args: getAria2cArgs(satelliteSettings),
      watch: false,
      exec_mode: 'fork_mode',
      cwd: `${satelliteSettings.scidapRoot}/files`
    },
    {
      name: 'mongod',
      script: `${satelliteBin}/mongod`,
      args: getMongodArgs(satelliteSettings),
      watch: false,
      exec_mode: 'fork_mode',
      cwd: `${satelliteSettings.scidapRoot}/mongodb`
    },
    {
      name: 'airflow-scheduler',
      script: `${cwlAirflowBin}/airflow`,
      args: ['scheduler'],
      interpreter: 'bash',
      watch: false,
      exec_mode: 'fork_mode',
      cwd: satelliteSettings.scidapRoot,
      env: getAirflowEnvVar(pathEnvVar, airflowSettings)
    },
    {
      name: 'airflow-apiserver',
      script: `${cwlAirflowBin}/cwl-airflow`,
      args: getAirflowApiServerArgs(satelliteSettings),
      interpreter: 'bash',
      watch: false,
      exec_mode: 'fork_mode',
      cwd: satelliteSettings.scidapRoot,
      env: getAirflowEnvVar(pathEnvVar, airflowSettings)
    },
    {
      name: 'satellite',
      script: `${satelliteBin}/../main.js`,
      interpreter: 'node',
      watch: false,
      exec_mode: 'fork_mode',
      cwd: satelliteSettings.scidapRoot,
      env: getSatelliteEnvVar(pathEnvVar, meteorDefaultSettingsJson, satelliteSettings, airflowSettings, rc_server_token)
    }
  ]
}