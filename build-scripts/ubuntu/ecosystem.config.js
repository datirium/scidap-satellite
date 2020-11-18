services_base_path = path.join(__dirname, '../Services/satellite/bin');
airflow_base_path = path.join(__dirname, '../Services/cwl-airflow/');
AIRFLOW_HOME = ""
scidapRoot = ""
mongoPort = 27017
airflowAPIPort = 8080
aria2cPort = 6800
port = 3070
proxy = ""
noProxy = ""
baseUrl = ""
secret_token = ""
triggerDag = "http://127.0.0.1:8080/api/experimental/dags/{dag_id}/dag_runs"
sslCert = ""
sslKey = ""
scidapSSLPort = 0
localFiles = ""


const aria_cmd_args = [
  '--enable-rpc',
  '--rpc-listen-all=false',
  `--rpc-listen-port=${aria2cPort}`,
  '--console-log-level=debug',
  '--auto-file-renaming=false'
];

if (proxy) {
  aria_cmd_args.push(`--all-proxy=${proxy}`);
}

let satellite_env_var = {
  MONGO_URL: `mongodb://localhost:${mongoPort}/scidap-satellite`,
  ROOT_URL: `${baseUrl}`,
  PORT: `${port}`,
  METEOR_SETTINGS: getSatelliteConf(),
  NODE_OPTIONS: '--trace-warnings --pending-deprecation',
  PATH: `${services_base_path}:${airflow_base_path}/bin_portable:/usr/bin:/bin:/usr/local/bin`

};

if (proxy) {
  satellite_env_var = {
      ...satellite_env_var,
      https_proxy: `${proxy}`,
      http_proxy: `${proxy}`,
      no_proxy: `${noProxy || ''}`
  };
}


function getSatelliteConf() {
  const satelliteConf = {
      ...SatelliteDefault,
      base_url: baseUrl,
      rc_server_token: secret_token,
      systemRoot: scidapRoot,
      airflow: {
          trigger_dag: triggerDag,
          dags_folder: `${AIRFLOW_HOME}/dags/`
      },
      logFile: `${AIRFLOW_HOME}/../satellite-service.log`,
  };

  if (sslCert && sslKey && scidapSSLPort) {
      satelliteConf['SSL'] = {
          'key': sslKey,
          'cert': sslCert,
          'port': scidapSSLPort
      };
  }

  if (localFiles) {
      satelliteConf.remotes.localfiles = {
          ...satelliteConf.remotes.localfiles,
          base_directory: `${app.getPath('home')}`    // `${this.satelliteSettings.scidapRoot}/files`  We don't have getPath in PM2
      };
  } else {
      satelliteConf.remotes.localfiles = {
          collection: {},
          publication: 'none'
      };
  }

  return satelliteConf;
}


// Add something that will run all airflow initdb, etc


module.exports = {
  apps : [
    {
      name: 'aria2c',
      script: `${services_base_path}/aria2c`,
      args: aria_cmd_args,
      watch: false,
      exec_mode: 'fork_mode',
      cwd: `${scidapRoot}/files`
    },
    {
      name: 'mongod',
      script: `${services_base_path}/mongod`,
      args: [`--port=${mongoPort}`, '--bind_ip=127.0.0.1', `--dbpath=${scidapRoot}/mongodb`],
      watch: false,
      exec_mode: 'fork_mode',
      cwd: `${scidapRoot}/mongodb`
    },
    {
      name: 'airflow-scheduler',
      script: `${airflow_base_path}/bin_portable/airflow`,
      args: ['scheduler'],
      interpreter: 'bash',
      watch: false,
      exec_mode: 'fork_mode',
      cwd: AIRFLOW_HOME,
      env: {
          PATH: `${services_base_path}:${airflow_base_path}/bin_portable:/usr/bin:/bin:/usr/local/bin`,
          AIRFLOW_HOME: AIRFLOW_HOME,
          LC_ALL: 'en_US.UTF-8',
          LANG: 'en_US.UTF-8'
      }
    },
    {
      name: 'airflow-apiserver',
      script: `${airflow_base_path}/bin_portable/cwl-airflow`,
      args: ['api', `--port=${airflowAPIPort}`],
      interpreter: 'bash',
      watch: false,
      exec_mode: 'fork_mode',
      cwd: `${scidapRoot}`,
      env: {
          PATH: `${services_base_path}:${airflow_base_path}/bin_portable:/usr/bin:/bin:/usr/local/bin`,
          AIRFLOW_HOME: AIRFLOW_HOME
      }
    },
    {
      name: 'satellite',
      script: `${services_base_path}/../main.js`,
      interpreter: 'node',
      watch: false,
      exec_mode: 'fork_mode',
      cwd: `${scidapRoot}`,
      env: satellite_env_var
    }
  ]
}


export const SatelliteDefault = {
  'name': 'SciDAP Satellite',
  'logLevel': 'debug',
  'base_url': 'https://10.17.109.169:3070/',
  'rc_server': 'https://api-sync.scidap.com',
  'rc_server_token': '',
  'cors_package': true,
  'email': {
      'url': '',
      'from': ''
  },
  'extra_users': [],
  'public': {
  },
  'accounts': {
      'sendVerificationEmail': true,
      'forbidClientAccountCreation': true,
      'loginExpirationInDays': 7
  },
  'systemRoot': '/scidap',
  'airflow': {
      'trigger_dag': 'http://127.0.0.1:8080/api/experimental/dags/{dag_id}/dag_runs',
      'dags_folder': '/home/datirium/airflow/dags'
  },
  'ldap': {},
  'oauth2server': {},
  'download': {
      'aria2': {
          'host': 'localhost',
          'port': 6800,
          'secure': false,
          'secret': '',
          'path': '/jsonrpc'
      }
  },
  'remotes': {
      'postform': {
          'collection': {},
          'publication': 'none'
      },
      'localfiles': {
          'caption': 'Local files',
          'type': 'files',
          'protocol': 'files',
          'base_directory': '/scidap/upload',
          'collection': {
              'name': 'local_files_collection',
              'nullConnection': true
          },
          'publication': 'local_files_collection',
          'refreshSessionInterval': 180
      },
      'directurl': {
          'caption': 'Direct URL',
          'type': 'urls',
          'protocol': [
              'https',
              'http',
              'ftp'
          ],
          'refreshSessionInterval': 180
      },
      'geo': {
          'caption': 'GEO',
          'type': 'urls',
          'protocol': [
              'geo'
          ],
          'refreshSessionInterval': 180
      }
  }
};