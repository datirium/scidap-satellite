#!/bin/bash

warn() { echo "$@" 1>&2; }

download_and_extract() {
  DOWNLOAD_URL=$1
  COMPRESSED_NAME=$2
  EXTRACTED_NAME=$3
  cd ${WORKDIR}
  echo "Processing link $DOWNLOAD_URL"
  if [ -e $COMPRESSED_NAME ]; then
    warn "File $COMPRESSED_NAME already exist. Skipping"
  else
    echo "Downloading $DOWNLOAD_URL"
    curl -L -O --fail $DOWNLOAD_URL
  fi
  if [ -e ${EXTRACTED_NAME} ]; then
    warn "Location $EXTRACTED_NAME already exist. Skipping"
  else
    echo "Extracting $COMPRESSED_NAME"
    tar -xvf $COMPRESSED_NAME > ${EXTRACTED_NAME}_extraction.log 2>&1
  fi
}

build_njs_client() {
  TEMP_PATH=$PATH
  PATH="${WORKDIR}/node-v${NODE_VERSION}-darwin-x64/bin:${PATH}"
  echo "Building njs-client from $1"
  cd $1
  npm install > ${WORKDIR}/npm_install.log 2>&1
  npm run build > ${WORKDIR}/npm_build.log 2>&1
  mv dist node_modules ${SATDIR}                                  # need only these two folders
  chmod -R u+w ${SATDIR}                                          # maybe we don't need it anymore?
  cd ${WORKDIR}
  PATH=$TEMP_PATH
}


# Setting up package versions
NODE_VERSION="12.22.0"
ARIA2_VERSION="1.35.0"
CWLAIRFLOW_VERSION="1.2.10"
CWLAIRFLOW_PYTHON_VERSION="3.8"
CWLAIRFLOW_MACOS_VERSION="11.2.1"
NJS_CLIENT_VERSION="b17a5e9a00fb"
SRA_TOOLKIT_VERSION="2.10.9"
POSTGRESQL_VERSION="13.1"
ARIA2_WEBUI_VERSION="master"


# Loading variables from .env if it was provided.
# Can be used for redefining package versions from above
# and setting NJS_CLIENT_LOCAL_PATH for building njs-client
# from the local directory. NJS_CLIENT_LOCAL_PATH should point to
# the scidap-satellite subdir as we don't need to build apisync.
# Alternatively, to download njs-client from Bitbucket valid
# BITBUCKET_USER and BITBUCKET_PASS should be set in .env
if [ -e .env ]; then
  echo "Loading variables from .env"
  export $(egrep -v '^#' .env | xargs)
fi


# Preparing working directory
rm -rf ../Services && mkdir -p ../Services
mkdir -p ../build/satellite/bin && cd ../build
WORKDIR=$(pwd)
SATDIR=${WORKDIR}/satellite


# Downloading Node
if [ -e ${SATDIR}/bin/node ]; then
  warn "Node has been already copied. Skipping"
else
  NODE_URL="https://nodejs.org/download/release/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-x64.tar.gz"
  download_and_extract $NODE_URL node-v${NODE_VERSION}-darwin-x64.tar.gz node-v${NODE_VERSION}-darwin-x64
  echo "Copying node-v${NODE_VERSION}-darwin-x64/bin/node"
  cp node-v${NODE_VERSION}-darwin-x64/bin/node ${SATDIR}/bin/
fi


# Downloadind and building njs-client, installing node modules
if [ -e ${SATDIR}/dist/src/main.js ]; then
  warn "njs-client has been already built. Skipping"
else
  if [ -n "$NJS_CLIENT_LOCAL_PATH" ]; then
    # Building njs-client from the local path, NJS_CLIENT_VERSION is not used
    build_njs_client ${NJS_CLIENT_LOCAL_PATH}
  else
    # Downloading and building njs-client release/tag NJS_CLIENT_VERSION
    # from Bitbucket using provided BITBUCKET_USER and BITBUCKET_PASS
    NJS_CLIENT_URL="https://${BITBUCKET_USER}:${BITBUCKET_PASS}@bitbucket.org/datirium/scidapsatelliteinteractions/get/${NJS_CLIENT_VERSION}.tar.gz"
    download_and_extract $NJS_CLIENT_URL ${NJS_CLIENT_VERSION}.tar.gz datirium-scidapsatelliteinteractions-${NJS_CLIENT_VERSION}
    build_njs_client datirium-scidapsatelliteinteractions-${NJS_CLIENT_VERSION}/scidap-satellite  # need subdir from the repository
  fi
fi


# Downloading Aria2
if [ -e ${SATDIR}/bin/aria2c ]; then
  warn "Aria2c has been already compiled. Skipping"
else
  ARIA2_URL="https://github.com/aria2/aria2/releases/download/release-${ARIA2_VERSION}/aria2-${ARIA2_VERSION}-osx-darwin.tar.bz2"
  download_and_extract $ARIA2_URL aria2-${ARIA2_VERSION}-osx-darwin.tar.bz2 aria2-${ARIA2_VERSION}
  echo "Copying aria2-${ARIA2_VERSION}"
  cp aria2-${ARIA2_VERSION}/bin/aria2c ${SATDIR}/bin/
fi


# Downloading CWL-Airflow
if [ -e ${WORKDIR}/cwl-airflow ]; then
  warn "CWL-Airflow folder has been already copied. Skipping"
else
  CWLAIRFLOW_URL="https://github.com/Barski-lab/cwl-airflow/releases/download/${CWLAIRFLOW_VERSION}/python_${CWLAIRFLOW_PYTHON_VERSION}_with_cwl_airflow_master_macos_${CWLAIRFLOW_MACOS_VERSION}.tar.gz"
  download_and_extract $CWLAIRFLOW_URL python_${CWLAIRFLOW_PYTHON_VERSION}_with_cwl_airflow_master_macos_${CWLAIRFLOW_MACOS_VERSION}.tar.gz python3
  echo "Copying python3 to ${WORKDIR}/cwl-airflow"
  cp -r python3 cwl-airflow
  # patch cwltool so it always use docker for javascript evaluation.
  # The normal node causes troubles when running from pm2 on Ubuntu.
  # Perhaps somehow related to subprocesses?. We don't apply this patch
  # on macOS, but it's good to have it here just in case
  # sed -i -e 's/^    trynodes = ("nodejs", "node")/    trynodes = []/g' ./cwl-airflow/lib/python${CWLAIRFLOW_PYTHON_VERSION}/site-packages/cwltool/sandboxjs.py
fi


# Downloading SRA-Toolkit (need to copy some extra files as fastq-dump doesn't work without them)
if [ -e ${SATDIR}/bin/fastq-dump ] && \
   [ -e ${SATDIR}/bin/fastq-dump-orig.${SRA_TOOLKIT_VERSION} ] && \
   [ -e ${SATDIR}/bin/vdb-config ] && \
   [ -e ${SATDIR}/bin/vdb-config.${SRA_TOOLKIT_VERSION} ]; then
  warn "fastq-dump has been already copied. Skipping"
else
  SRA_TOOLKIT_URL="http://ftp-trace.ncbi.nlm.nih.gov/sra/sdk/${SRA_TOOLKIT_VERSION}/sratoolkit.${SRA_TOOLKIT_VERSION}-mac64.tar.gz"
  download_and_extract $SRA_TOOLKIT_URL sratoolkit.${SRA_TOOLKIT_VERSION}-mac64.tar.gz sratoolkit.${SRA_TOOLKIT_VERSION}-mac64
  echo "Copying fastq-dump and related files"
  cp -L sratoolkit.${SRA_TOOLKIT_VERSION}-mac64/bin/fastq-dump ${SATDIR}/bin/
  cp -L sratoolkit.${SRA_TOOLKIT_VERSION}-mac64/bin/fastq-dump-orig.${SRA_TOOLKIT_VERSION} ${SATDIR}/bin/
  cp -L sratoolkit.${SRA_TOOLKIT_VERSION}-mac64/bin/vdb-config ${SATDIR}/bin/
  cp -L sratoolkit.${SRA_TOOLKIT_VERSION}-mac64/bin/vdb-config.${SRA_TOOLKIT_VERSION} ${SATDIR}/bin/
fi


# Downloading PostgreSQL
if [ -e ${SATDIR}/bin/initdb ] && \
   [ -e ${SATDIR}/bin/createdb ] && \
   [ -e ${SATDIR}/bin/pg_ctl ] && \
   [ -e ${SATDIR}/bin/pg_isready ] && \
   [ -e ${SATDIR}/bin/postgres ] && \
   [ -e ${SATDIR}/bin/psql ] && \
   [ -e ${SATDIR}/lib ] && \
   [ -e ${SATDIR}/share ]; then
  warn "PostgreSQL binaries, libs and shares have been already copied. Skipping"
else
  POSTGRESQL_URL="https://get.enterprisedb.com/postgresql/postgresql-${POSTGRESQL_VERSION}-1-osx-binaries.zip"
  download_and_extract $POSTGRESQL_URL postgresql-${POSTGRESQL_VERSION}-1-osx-binaries.zip pgsql
  echo "Copying PostgreSQL binaries, libs and shares"
  cp -L pgsql/bin/initdb ${SATDIR}/bin/
  cp -L pgsql/bin/createdb ${SATDIR}/bin/
  cp -L pgsql/bin/pg_ctl ${SATDIR}/bin/
  cp -L pgsql/bin/pg_isready ${SATDIR}/bin/
  cp -L pgsql/bin/postgres ${SATDIR}/bin/
  cp -L pgsql/bin/psql ${SATDIR}/bin/
  # cp -L pgsql/bin/psql.bin ${SATDIR}/bin/   # no psql.bin in PostgreSQL 13.1
  cp -r pgsql/lib ${SATDIR}/
  cp -r pgsql/share ${SATDIR}/
fi


# Copying start scripts
cd ${WORKDIR}
if [ -e ${SATDIR}/bin/start_postgres.sh ] && [ -e ${SATDIR}/bin/start_scheduler.sh ] && [ -e ${SATDIR}/bin/start_apiserver.sh ]; then
  warn "Start scripts have been already copied. Skipping"
else
  echo "Copying start scripts: start_postgres.sh, start_scheduler.sh, start_apiserver.sh"
  cp -L ../build-scripts/start_scripts/start_postgres.sh ${SATDIR}/bin/
  cp -L ../build-scripts/start_scripts/start_scheduler.sh ${SATDIR}/bin/
  cp -L ../build-scripts/start_scripts/start_apiserver.sh ${SATDIR}/bin/
fi


# Moving installed programs to the Services folder
# No need to copy configs and utilities from the
# build-scripts folder as they will be copied by
# the Electron builder
cd ${WORKDIR}
mv cwl-airflow ${SATDIR} ../Services


cd $WORKDIR
if [ -e "webui-aria2" ]; then
  warn "webui-aria2 has been already istalled. Skipping installation"
else
  TEMP_PATH=$PATH
  PATH="${WORKDIR}/node-v${NODE_VERSION}-darwin-x64/bin:${PATH}"
  git clone https://github.com/ziahamza/webui-aria2
  cd webui-aria2
  git checkout ${ARIA2_WEBUI_VERSION}
  npm install > ${WORKDIR}/webui_aria2_npm_install.log 2>&1
  npm i node-sass > ${WORKDIR}/node_sass_npm_install.log 2>&1
  npm run build > ${WORKDIR}/webui_aria2_npm_build.log 2>&1
  PATH=$TEMP_PATH
fi
