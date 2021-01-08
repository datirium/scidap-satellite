#!/bin/bash

export PGHOST="${PGHOST:="127.0.0.1"}"
export PGPORT="${PGPORT:="5432"}"
export PGDATA="${PGDATA:="~/pgdata"}"
export PGUSER="${PGUSER:="pg_user"}"
export PGPASSWORD="${PGPASSWORD:="pg_password"}"
export PGDATABASE="${PGDATABASE:="pg_database"}"
export AIRFLOW_HOME="${AIRFLOW_HOME:="~/airflow"}"
export PROCESS_REPORT_URL="${PROCESS_REPORT_URL:="http://127.0.0.1:3069"}"

echo "Wait until required database is ready"
until pg_isready --dbname="${PGDATABASE}"
do
    echo "Sleep 1 sec"
    sleep 1;
done

echo "Run initial configuration for CWL-Airflow"
cwl-airflow init --upgrade

echo "Recreate process_report connection"
airflow connections delete process_report
airflow connections add process_report --conn-uri "${PROCESS_REPORT_URL}"

echo "Start airflow scheduler"
airflow scheduler "$@"
