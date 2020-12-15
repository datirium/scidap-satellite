const path = require('path');
const fs = require('fs');
const child_process = require('child_process');
const ini = require('ini');
const os = require('os');


const FILES_DIR = "files";
const MONGODB_DIR = "mongodb";
const AIRFLOW_DIR = "airflow";
const SATELLITE_DIR = "satellite";
const POSTGRES_DIR = "pgdata";
const MONGO_COLLECTION = "scidap-satellite"


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
    '--bind_ip', '127.0.0.1',
    '--port', satelliteSettings.mongoPort,
    '--dbpath', path.join(satelliteSettings.scidapRoot, MONGODB_DIR)
  ];
  return mongodArgs
}


function getAirflowApiServerArgs(satelliteSettings){
  const airflowApiServerArgs = [
    '--port', satelliteSettings.airflowAPIPort
  ];
  return airflowApiServerArgs
}


function getPostgresEnvVar(pathEnvVar, satelliteSettings, databaseSettings){
  const postgresEnvVar = {
    PATH: pathEnvVar,
    PGHOST: '127.0.0.1',
    PGPORT: databaseSettings.db_port,
    PGDATA: path.join(satelliteSettings.scidapRoot, POSTGRES_DIR),
    PGUSER: databaseSettings.db_user,
    PGPASSWORD: databaseSettings.db_password,
    PGDATABASE: databaseSettings.db_name
  };
  return postgresEnvVar
}


function getAirflowEnvVar(pathEnvVar, satelliteSettings){
  const airflowEnvVar = {
    PATH: pathEnvVar,
    AIRFLOW_HOME: path.join(satelliteSettings.scidapRoot, AIRFLOW_DIR),
    PROCESS_REPORT_URL: `http://127.0.0.1:${satelliteSettings.port}`,
    LC_ALL: 'en_US.UTF-8',
    LANG: 'en_US.UTF-8'
  };
  return airflowEnvVar
}


function getSatelliteEnvVar(pathEnvVar, meteorDefaultSettingsJson, satelliteSettings, rc_server_token){
  let satelliteEnvVar = {
    PATH: pathEnvVar,
    MONGO_URL: `mongodb://localhost:${satelliteSettings.mongoPort}/${MONGO_COLLECTION}`,
    ROOT_URL: satelliteSettings.baseUrl,
    PORT: satelliteSettings.port,
    METEOR_SETTINGS: getMeteorSettings(meteorDefaultSettingsJson, satelliteSettings, rc_server_token),
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


function getMeteorSettings(meteorDefaultSettingsJson, satelliteSettings, rc_server_token){
  const meteorDefaultSettings = JSON.parse(fs.readFileSync(meteorDefaultSettingsJson));
  const meteorSettings = {
    ...meteorDefaultSettings,
    base_url: satelliteSettings.baseUrl,
    rc_server_token: rc_server_token,
    systemRoot: satelliteSettings.scidapRoot,
    airflow: {
      trigger_dag: satelliteSettings.triggerDag,
      dags_folder: path.join(satelliteSettings.scidapRoot, AIRFLOW_DIR, 'dags')               // won't work if airflow.cfg was updated manually
    },
    logFile: path.join(satelliteSettings.scidapRoot, SATELLITE_DIR, 'satellite-service.log')
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
      base_directory: path.join(satelliteSettings.scidapRoot, FILES_DIR)
    };
  } else {
    meteorSettings.remotes.localfiles = {
      collection: {},
      publication: 'none'
    };
  }
  return meteorSettings;
}


function waitForInitConfiguration(pathEnvVar, satelliteSettings, airflowSettings, databaseSettings){
  /*
  Creates all required folders.
  Creates airflow.cfg by running airflow with the configured AIRFLOW_HOME.
  Patches airflow.cfg.
  */
  const folders = [
    path.join(satelliteSettings.scidapRoot, FILES_DIR),
    path.join(satelliteSettings.scidapRoot, MONGODB_DIR),
    path.join(satelliteSettings.scidapRoot, AIRFLOW_DIR),
    path.join(satelliteSettings.scidapRoot, SATELLITE_DIR),
    path.join(satelliteSettings.scidapRoot, POSTGRES_DIR)
  ]
  for (folder of folders) {
    try {
      fs.mkdirSync(folder, {recursive: true});
    } catch (e) {
      console.log(`${folder} directory already exist`);
    }
  }
  child_process.spawnSync(
    "airflow", [],
    {
      cwd: path.join(satelliteSettings.scidapRoot, AIRFLOW_DIR),
      shell: true,
      env: getAirflowEnvVar(pathEnvVar, satelliteSettings)
    }
  )
  const airflowCfg = ini.parse(fs.readFileSync(path.join(satelliteSettings.scidapRoot, AIRFLOW_DIR, 'airflow.cfg'), 'utf-8'));
  for (key in airflowSettings){
    [section, parameter] = key.split(".")
    airflowCfg[section][parameter] = airflowSettings[key]
  };
  airflowCfg.core.sql_alchemy_conn = `postgresql+psycopg2://${databaseSettings.db_user}:${databaseSettings.db_password}@127.0.0.1:${databaseSettings.db_port}/${databaseSettings.db_name}`
  fs.writeFileSync(path.join(satelliteSettings.scidapRoot, AIRFLOW_DIR, 'airflow.cfg'), ini.stringify(airflowCfg, {whitespace: true}));
}


// variables that depend on the script location and should be initiated on every run
const satelliteBin = path.join(__dirname, './satellite/bin');
const cwlAirflowBin = path.join(__dirname, './cwl-airflow/bin_portable');
const pathEnvVar = `${satelliteBin}:${cwlAirflowBin}:/usr/bin:/bin:/usr/local/bin`
const meteorDefaultSettingsJson = path.join(__dirname, 'meteor_default_settings.json');

// variables that should be kept secret
const rc_server_token = ""

// variables that can be set in the separate configuration file
const satelliteSettings = {
  'port': 3069,
  'scidapRoot': path.join(os.homedir(), 'scidap'),
  'scidapSSLPort': 3070,
  'airflowAPIPort': 8080,
  'aria2cPort': 6800,
  'mongoPort': 27017,
  'baseUrl': 'http://localhost:3069/',
  'sslCert': '',
  'sslKey': '',
  'triggerDag': 'http://127.0.0.1:8080/api/experimental/dags/{dag_id}/dag_runs',
  'localFiles': true
}
const airflowSettings = { 
  'core.executor': 'LocalExecutor',
  'core.dag_concurrency': 2,
  'core.dags_are_paused_at_creation': 'False',
  'core.load_examples': 'False',
  'core.max_active_runs_per_dag': 1
}
const databaseSettings = {
  'db_port': 5432,                   // port number to connect to the database
  'db_user': 'airflow',              // superuser name, as well as the name of the user for Airflow to connect to db
  'db_password': 'airflow',          // superuser password, will be also used by Airflow
  'db_name': 'airflow'               // name of the database for Airflow to save its metadata
}


waitForInitConfiguration(pathEnvVar, satelliteSettings, airflowSettings, databaseSettings)


module.exports = {
  apps : [
    {
      name: 'aria2c',
      script: path.join(satelliteBin, 'aria2c'),
      args: getAria2cArgs(satelliteSettings),
      watch: false,
      exec_mode: 'fork_mode',
      cwd: path.join(satelliteSettings.scidapRoot, FILES_DIR)
    },
    {
      name: 'mongod',
      script: path.join(satelliteBin, 'mongod'),
      args: getMongodArgs(satelliteSettings),
      watch: false,
      exec_mode: 'fork_mode',
      cwd: path.join(satelliteSettings.scidapRoot, MONGODB_DIR)
    },
    {
      name: 'postgres',
      script: path.join(satelliteBin, 'start_postgres.sh'),
      args: ['-k ""'],                                                         // set -k to "" to disable access through socket as we don't need it
      watch: false,
      exec_mode: 'fork_mode',
      cwd: path.join(satelliteSettings.scidapRoot, POSTGRES_DIR),
      env: getPostgresEnvVar(pathEnvVar, satelliteSettings, databaseSettings)  // -D, -h and -p will be read from the environment variables
    },
    {
      name: 'airflow-scheduler',
      script: path.join(satelliteBin, 'start_scheduler.sh'),
      args: [],
      interpreter: 'bash',
      watch: false,
      exec_mode: 'fork_mode',
      cwd: path.join(satelliteSettings.scidapRoot, AIRFLOW_DIR),
      env: {
        ...getPostgresEnvVar(pathEnvVar, satelliteSettings, databaseSettings),
        ...getAirflowEnvVar(pathEnvVar, satelliteSettings)
      }
    },
    {
      name: 'airflow-apiserver',
      script: path.join(satelliteBin, 'start_apiserver.sh'),
      args: getAirflowApiServerArgs(satelliteSettings),
      interpreter: 'bash',
      watch: false,
      exec_mode: 'fork_mode',
      cwd: path.join(satelliteSettings.scidapRoot, AIRFLOW_DIR),
      env: {
        ...getPostgresEnvVar(pathEnvVar, satelliteSettings, databaseSettings),
        ...getAirflowEnvVar(pathEnvVar, satelliteSettings)
      }
    },
    {  // TODO make sure it's run after mongodb is available
      name: 'satellite',
      script: path.join(satelliteBin, '../main.js'),
      interpreter: 'node',
      watch: false,
      exec_mode: 'fork_mode',
      cwd: path.join(satelliteSettings.scidapRoot, SATELLITE_DIR),
      env: getSatelliteEnvVar(pathEnvVar, meteorDefaultSettingsJson, satelliteSettings, rc_server_token)
    }
  ]
}