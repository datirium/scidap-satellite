#!/bin/bash

export PGHOST="${PGHOST:="127.0.0.1"}"
export PGPORT="${PGPORT:="5432"}"
export PGDATA="${PGDATA:="~/pgdata"}"
export PGUSER="${PGUSER:="pg_user"}"
export PGPASSWORD="${PGPASSWORD:="pg_password"}"
export PGDATABASE="${PGDATABASE:="pg_database"}"
export AIRFLOW_HOME="${AIRFLOW_HOME:="~/airflow"}"

echo "Wait until required database is ready"
until pg_isready --dbname="${PGDATABASE}"
do
    echo "Sleep 1 sec"
    sleep 1;
done

echo "Start cwl-airflow api"
cwl-airflow api "$@"
