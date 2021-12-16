#!/bin/bash

export PGHOST="${PGHOST:="127.0.0.1"}"
export PGPORT="${PGPORT:="5432"}"
export PGDATA="${PGDATA:="~/pgdata"}"
export PGUSER="${PGUSER:="pg_user"}"
export PGPASSWORD="${PGPASSWORD:="pg_password"}"
export PGDATABASE="${PGDATABASE:="pg_database"}"
export AIRFLOW_HOME="${AIRFLOW_HOME:="~/airflow"}"
export PROCESS_REPORT_URL="${PROCESS_REPORT_URL:="http://127.0.0.1:3069"}"


echo "Start airflow webserver"

export LC_ALL="en_US.UTF-8"
export LANG="en_US.UTF-8"

airflow users create --username airflow --password airflow -r Admin -e airflow@example.com -f Airflow -l Airflow
airflow webserver
#--hostname 127.0.0.1 --port 8081
