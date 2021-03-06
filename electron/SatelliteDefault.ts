export const SatelliteDefault: any = {
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