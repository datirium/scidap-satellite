#!/bin/bash

export PGHOST="${PGHOST:="127.0.0.1"}"
export PGPORT="${PGPORT:="5432"}"
export PGDATA="${PGDATA:="~/data"}"
export PGUSER="${PGUSER:="user"}"
export PGPASSWORD="${PGPASSWORD:="password"}"
export PGDATABASE="${PGDATABASE:="database"}"

echo "Init PostgreSQL database cluster (only md5 passwords are allowed)"
initdb --auth=md5 --username="${PGUSER}" --pwfile=<(echo "${PGPASSWORD}")

echo "Start PostgreSQL server before creating database"
pg_ctl --options='-k ""' start > /dev/null 2>&1

echo "Wait until PostgreSQL server is ready (ping postgres database)"
until pg_isready --dbname=postgres
do
    echo "Sleep 1 sec"
    sleep 1;
done

echo "Create new database"
createdb --owner "${PGUSER}"                                              # -h, -p and -U arguments are read from the environment variables

echo "Stop PostgreSQL server after required database has been created"
pg_ctl stop -m smart                                                      # waits until all open connections are closed

echo "Start PostgreSQL server through postgres as it's easier to keep it in the foreground"
postgres "$@"