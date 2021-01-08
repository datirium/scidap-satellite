const path = require('path');
const fs = require('fs');
const child_process = require('child_process');
const os = require('os');
const url = require('url');
const ini = require('ini');
const process = require('process');


function loadSettings(settings_locations){
  for (location of settings_locations){
    try {
      settings = JSON.parse(fs.readFileSync(location));
      console.log(`Successfully loaded settings from ${location}`);
      break;
    } catch (e) {
      console.log(`Failed to load settings from ${location}`);
    }
  };
  // in case scidapRoot was set as a relative path, we need to resolve it based on the homedir
  settings.satelliteSettings.scidapRoot = path.resolve(os.homedir(), settings.satelliteSettings.scidapRoot);
  // in case defaultLocations were set as a relative path, we need to resolve them based on settings.satelliteSettings.scidapRoot
  settings.defaultLocations = getDefaultLocations(settings);
  // set up meteor settings based on settings.satelliteSettings
  settings.meteorSettings = getMeteorSettings(settings);
  return settings;
}


function getDefaultLocations(settings){
  const defaultLocations = {
    files: path.resolve(settings.satelliteSettings.scidapRoot, settings.defaultLocations.files),
    mongodb: path.resolve(settings.satelliteSettings.scidapRoot, settings.defaultLocations.mongodb),
    airflow: path.resolve(settings.satelliteSettings.scidapRoot, settings.defaultLocations.airflow),
    satellite: path.resolve(settings.satelliteSettings.scidapRoot, settings.defaultLocations.satellite),
    pgdata: path.resolve(settings.satelliteSettings.scidapRoot, settings.defaultLocations.pgdata)
  };
  return defaultLocations
}


function getAria2cArgs(settings){
  let aria2cArgs = {
    ...settings.aria2cSettings,
    "--enable-rpc": true,
    "--rpc-listen-all": false,
    "--rpc-listen-port": settings.satelliteSettings.aria2cPort
  };
  if (settings.satelliteSettings.proxy) {
    aria2cArgs["--all-proxy"] = settings.satelliteSettings.proxy;
  };
  return Object.keys(aria2cArgs).map((key) => `${key}=${aria2cArgs[key]}`);  // to return as array of "key=value" 
}


function getMongodArgs(settings){
  const mongodArgs = [
    '--bind_ip', '127.0.0.1',
    '--port', settings.satelliteSettings.mongoPort,
    '--dbpath', settings.defaultLocations.mongodb
  ];
  return mongodArgs
}


function getAirflowApiServerArgs(settings){
  const airflowApiServerArgs = [
    '--port', settings.satelliteSettings.airflowAPIPort
  ];
  return airflowApiServerArgs
}


function getPostgresEnvVar(settings){
  const postgresEnvVar = {
    PATH: settings.executables.pathEnvVar,
    PGHOST: '127.0.0.1',
    PGPORT: settings.databaseSettings.db_port,
    PGDATA: settings.defaultLocations.pgdata,
    PGUSER: settings.databaseSettings.db_user,
    PGPASSWORD: settings.databaseSettings.db_password,
    PGDATABASE: settings.databaseSettings.db_name
  };
  return postgresEnvVar
}


function getAirflowEnvVar(settings){
  const airflowEnvVar = {
    PATH: settings.executables.pathEnvVar,
    AIRFLOW_HOME: settings.defaultLocations.airflow,
    PROCESS_REPORT_URL: `http://127.0.0.1:${settings.satelliteSettings.port}`,
    LC_ALL: 'en_US.UTF-8',
    LANG: 'en_US.UTF-8'
  };
  return airflowEnvVar
}


function getSatelliteEnvVar(settings){
  let satelliteEnvVar = {
    PATH: settings.executables.pathEnvVar,
    MONGO_URL: `mongodb://localhost:${settings.satelliteSettings.mongoPort}/${settings.satelliteSettings.mongoCollection}`,
    ROOT_URL: settings.satelliteSettings.baseUrl,
    PORT: settings.satelliteSettings.port,
    // we need to re-evaluate meteorSettings, because on macOS rcServerToken was not loaded from the config file and therefore was not present when we run getSettings
    METEOR_SETTINGS: getMeteorSettings(settings),
    NODE_OPTIONS: '--trace-warnings --pending-deprecation'
  };
  if (settings.satelliteSettings.proxy) {
    satelliteEnvVar = {
      ...satelliteEnvVar,
      https_proxy: settings.satelliteSettings.proxy,
      http_proxy: settings.satelliteSettings.proxy,
      no_proxy: settings.satelliteSettings.noProxy || ''
    };
  };
  return satelliteEnvVar
}


function getMeteorSettings(settings){
  const meteorSettings = {
    ...settings.meteorSettings,
    name: 'scidap-satellite',
    base_url: settings.satelliteSettings.baseUrl,
    rc_server_token: settings.satelliteSettings.rcServerToken,
    rc_server: settings.satelliteSettings.rcServer,
    systemRoot: settings.satelliteSettings.scidapRoot,
    airflow: {
      trigger_dag: `http://127.0.0.1:${settings.satelliteSettings.airflowAPIPort}/api/experimental/dags/{dag_id}/dag_runs`,
      dags_folder: path.resolve(settings.defaultLocations.airflow, 'dags')
    },
    logFile: path.resolve(settings.defaultLocations.satellite, 'satellite-service.log')
  };
  if (settings.satelliteSettings.sslCert && settings.satelliteSettings.sslKey && settings.satelliteSettings.scidapSSLPort) {
    meteorSettings['SSL'] = {
      'key': settings.satelliteSettings.sslKey,
      'cert': settings.satelliteSettings.sslCert,
      'port': settings.satelliteSettings.scidapSSLPort
    };
  }
  meteorSettings.remotes.localfiles = {
    'caption': 'Local files',
    'type': 'files',
    'protocol': 'files',
    'base_directory': settings.defaultLocations.files,
    'collection': settings.satelliteSettings.localFiles?{'name': 'local_files_collection', 'nullConnection': true}:{},
    'publication': settings.satelliteSettings.localFiles?'local_files_collection':'none',
    'refreshSessionInterval': 180
  }
  meteorSettings.download = {
    'aria2': {
      'host': 'localhost',
      'port': settings.satelliteSettings.aria2cPort,
      'secure': false,
      'secret': '',
      'path': '/jsonrpc'
    }
  }
  return meteorSettings;
}


function waitForInitConfiguration(settings){
  /*
  Creates all required folders.
  Creates airflow.cfg by running airflow with the configured AIRFLOW_HOME.
  Patches airflow.cfg.
  Checks if '~/.ncbi/user-settings.mkfg' exists. If not, creates it.
  Checks if '~/.ncbi/user-settings.mkfg.scidap.backup' exists. If not, creates it.
  Adds or updates proxy configurations in the user-settings.mkfg file based on
  settings.satelliteSettings.
  */

  const folders = [
    settings.satelliteSettings.scidapRoot,                            // for node < 10.12.0 recursive won't work, so we need to at least create scidapRoot
    settings.defaultLocations.files,
    settings.defaultLocations.mongodb,
    settings.defaultLocations.airflow,
    settings.defaultLocations.satellite,
    settings.defaultLocations.pgdata
  ]
  for (folder of folders) {
    try {
      fs.mkdirSync(folder, {recursive: true});
    } catch (e) {
      console.log(`Failed to create directory ${folder} due to ${e}`);
    }
  }
  child_process.spawnSync(
    "airflow", [],
    {
      cwd: settings.defaultLocations.airflow,
      shell: true,
      env: getAirflowEnvVar(settings)
    }
  )
  const airflowCfg = ini.parse(fs.readFileSync(path.resolve(settings.defaultLocations.airflow, 'airflow.cfg'), 'utf-8'));
  for (key in settings.airflowSettings){
    [section, parameter] = key.split(".")
    airflowCfg[section][parameter] = settings.airflowSettings[key]
  };
  airflowCfg.core.sql_alchemy_conn = `postgresql+psycopg2://${settings.databaseSettings.db_user}:${settings.databaseSettings.db_password}@127.0.0.1:${settings.databaseSettings.db_port}/${settings.databaseSettings.db_name}`
  fs.writeFileSync(path.resolve(settings.defaultLocations.airflow, 'airflow.cfg'), ini.stringify(airflowCfg, {whitespace: true}));
  const ncbi_dir = path.resolve(os.homedir(), '.ncbi')
  const mkfg_file = path.resolve(ncbi_dir, 'user-settings.mkfg')
  const mkfg_file_backup = path.resolve(ncbi_dir, 'user-settings.mkfg.backuped_by_scidap')
  child_process.spawnSync(
    `if [ ! -e ${mkfg_file} ]; then
       echo "Creating ${mkfg_file}"
       mkdir -p ${ncbi_dir}
       touch ${mkfg_file}
     elif [ ! -e ${mkfg_file_backup} ]; then
       echo "Backing up ${mkfg_file} to ${mkfg_file_backup}"
       cp ${mkfg_file} ${mkfg_file_backup}
     fi

     if ! grep -q "/LIBS/GUID" ${mkfg_file}; then
       echo "Adding /LIBS/GUID"
       echo "/LIBS/GUID = '$(uuidgen)'" >> ${mkfg_file}
     fi

     if ! grep -q "/http/proxy/enabled" ${mkfg_file}; then
       echo "Adding proxy settings"
       echo "/http/proxy/enabled = '${settings.satelliteSettings.proxy?true:false}'" >> ${mkfg_file}
     else
       echo "Updating proxy settings"
       sed -i -e "s/^\\/http\\/proxy\\/enabled.*/\\/http\\/proxy\\/enabled = '${settings.satelliteSettings.proxy?true:false}'/g" ${mkfg_file}
     fi

     if ! grep -q "/http/proxy/path" ${mkfg_file}; then
       echo "Adding proxy path"
       echo "/http/proxy/path = '${settings.satelliteSettings.proxy?url.parse(settings.satelliteSettings.proxy).host:""}'" >> ${mkfg_file}
     else
       echo "Updating proxy path"
       sed -i -e "s/^\\/http\\/proxy\\/path.*/\\/http\\/proxy\\/path = '${settings.satelliteSettings.proxy?url.parse(settings.satelliteSettings.proxy).host:""}'/g" ${mkfg_file}
     fi`,
    [],
    {
      cwd: settings.satelliteSettings.scidapRoot,
      shell: true,
      env: getAirflowEnvVar(settings)  // we need only PATH from there
    }
  )
}


function getSettings(cwd, customLocation){
  /*
  Relative locations will be resolved based on __dirname if cwd was not provided.
  If customLocation is provided it have higher priority compared to other locations
  */
 
  cwd = cwd || __dirname;

  // might be different between Ubuntu and macOS
  const settings_locations = [
    process.env.SCIDAP_SETTINGS,
    path.resolve(cwd, '../../scidap_settings.json'),
    path.resolve(os.homedir(), './.config/scidap-satellite/scidap_settings.json'),  // might be different on mac
    path.resolve(cwd, '../configs/scidap_default_settings.json')                    // default settings should be always present
  ];

  if (customLocation){
    settings_locations.unshift(customLocation);
  };

  // might be different between Ubuntu and macOS
  // Load settings from the external file, add dynamically configured locations for executables
  const settings = {
    ...loadSettings(settings_locations),
    executables: {
      aria2c: path.resolve(cwd, '../satellite/bin/aria2c'),
      mongod: path.resolve(cwd, '../satellite/bin/mongod'),
      startPostgres: path.resolve(cwd, '../satellite/bin/start_postgres.sh'),
      startScheduler: path.resolve(cwd, '../satellite/bin/start_scheduler.sh'),
      startApiserver: path.resolve(cwd, '../satellite/bin/start_apiserver.sh'),
      startSatellite: path.resolve(cwd, '../satellite/main.js'),
      satelliteBin: path.resolve(cwd, '../satellite/bin'),
      cwlAirflowBin: path.resolve(cwd, '../cwl-airflow/bin_portable'),
      pathEnvVar: `${ path.resolve(cwd, '../satellite/bin') }:${ path.resolve(cwd, '../cwl-airflow/bin_portable') }:/usr/bin:/bin:/usr/local/bin`  // maybe add to the original PATH to make it universal, might be different on mac
    }
  }
  
  return settings;
}


function getRunConfiguration(settings){

  const configuration = {
    apps: [
      {
        name: 'aria2c',
        script: settings.executables.aria2c,
        args: getAria2cArgs(settings),
        watch: false,
        exec_mode: 'fork_mode',
        cwd: settings.defaultLocations.files
      },
      {
        name: 'mongod',
        script: settings.executables.mongod,
        args: getMongodArgs(settings),
        watch: false,
        exec_mode: 'fork_mode',
        cwd: settings.defaultLocations.mongodb
      },
      {
        name: 'postgres',
        script: settings.executables.startPostgres,
        args: [],
        watch: false,
        exec_mode: 'fork_mode',
        cwd: settings.defaultLocations.pgdata,
        env: getPostgresEnvVar(settings)  // -D, -h and -p will be read from the environment variables
      },
      {
        name: 'airflow-scheduler',
        script: settings.executables.startScheduler,
        args: [],
        interpreter: 'bash',
        watch: false,
        exec_mode: 'fork_mode',
        cwd: settings.defaultLocations.airflow,
        env: {
          ...getPostgresEnvVar(settings),
          ...getAirflowEnvVar(settings)
        }
      },
      {
        name: 'airflow-apiserver',
        script: settings.executables.startApiserver,
        args: getAirflowApiServerArgs(settings),
        interpreter: 'bash',
        watch: false,
        exec_mode: 'fork_mode',
        cwd: settings.defaultLocations.airflow,
        env: {
          ...getPostgresEnvVar(settings),
          ...getAirflowEnvVar(settings)
        }
      },
      {  // TODO make sure it's run after mongodb is available
        name: 'satellite',
        script: settings.executables.startSatellite,
        interpreter: 'node',
        watch: false,
        exec_mode: 'fork_mode',
        cwd: settings.defaultLocations.satellite,
        env: getSatelliteEnvVar(settings)
      }
    ]
  };
  
  return configuration;
}


module.exports = {
  waitForInitConfiguration: waitForInitConfiguration,
  getSettings: getSettings,
  getRunConfiguration: getRunConfiguration
}