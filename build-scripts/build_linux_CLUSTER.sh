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
    tar -xvf $COMPRESSED_NAME > /dev/null 2>&1
  fi
}

build_njs_client() {
  TEMP_PATH=$PATH
  PATH="${WORKDIR}/node-v${NODE_VERSION}-linux-x64/bin:${PATH}"
  echo "Installing dependencies njs-client"
  cd $1
  npm install > ${WORKDIR}/njs_npm_install.log 2>&1
  echo "Building njs-client"
  npm run build > ${WORKDIR}/njs_npm_build.log 2>&1
  mv dist node_modules ${SATDIR}                                  # need only these two folders
  chmod -R u+w ${SATDIR}                                          # maybe we don't need it anymore?
  cd ${WORKDIR}
  PATH=$TEMP_PATH
}

build_cluster_api() {
  TEMP_PATH=$PATH
  # PATH="${WORKDIR}/node-v${NODE_VERSION}-linux-x64/bin:${PATH}"
  echo "Building api with shiv"
  cd $1

  # shiv -c start-cluster-api -o start-cluster-api . > ${WORKDIR}/cluster_build.log 2>&1
  # mv start-cluster-api ${SATDIR}/bin

  cd ${WORKDIR}
  PATH=$TEMP_PATH
}

download_and_build_toil() {
  TEMP_PATH=$PATH
  # PATH="${WORKDIR}/node-v${NODE_VERSION}-linux-x64/bin:${PATH}"
  echo "Building api with shiv"
  git clone https://github.com/michael-kotliar/toil.git
  cd toil
  shiv -c start-cluster-api -o start-cluster-api . > ${WORKDIR}/njs_npm_build.log 2>&1
  mv start-cluster-api ${SATDIR}/bin
  cd ${WORKDIR}
  PATH=$TEMP_PATH
}

install_pm2() {
  TEMP_PATH=$PATH
  PATH="${WORKDIR}/node-v${NODE_VERSION}-linux-x64/bin:${PATH}"
  cd $1
  npm install pm2 > ${WORKDIR}/pm2_npm_install.log 2>&1
  chmod -R u+w ${SATDIR}                                          # maybe we don't need it anymore?
  cd ${WORKDIR}
  PATH=$TEMP_PATH
}

# Setting up package versions
SATELLITE_VERSION_LABEL=$1
NODE_VERSION=$2
ARIA2_VERSION=$3
# CWLAIRFLOW_VERSION=$4
# CWLAIRFLOW_PYTHON_VERSION=$5
# NJS_CLIENT_VERSION=$6
SRA_TOOLKIT_VERSION=$4
POSTGRESQL_VERSION=$5 
# PYTHON_VERSION=$6
CLUSTER_REPO_PATH=$6
NJS_REPO_PATH=$7

DISTRO=`awk -F= '/^NAME/{print $2}' /etc/os-release`              # either "Ubuntu" or "CentOS Linux"

# if [[ -z "${BITBUCKET_USER}" ]] || [[ -z "${BITBUCKET_PASS}" ]]; then
#   echo "BITBUCKET_USER and/or BITBUCKET_PASS are not set as environment variables."
#   echo "We won't be able to build NJS-Client. Exiting."
#   exit 1
# fi

echo "Installing required dependencies for $DISTRO"
if [[ $DISTRO == *"CentOS"* ]]; then
  yum install git gcc make bzip2 -y > /dev/null 2>&1
  SRA_TOOLKIT_SUFFIX="centos_linux64"
  DISTRO_TAG="centos"
elif [[ $DISTRO == *"Ubuntu"* ]]; then
  apt-get update > /dev/null 2>&1
  apt-get install git g++ make curl -y > /dev/null 2>&1
  SRA_TOOLKIT_SUFFIX="ubuntu64"
  DISTRO_TAG="ubuntu"
else
  echo "Failed to identify OS. Exiting."
  exit 1
fi

echo "Preparing working directory"
rm -rf ./bundle && mkdir -p ./bundle
rm -rf ./build && mkdir -p ./build/satellite/bin && cd ./build
WORKDIR=$(pwd)
SATDIR=${WORKDIR}/satellite

echo "Current working directory is ${WORKDIR}"

echo "Downloading Node"
NODE_URL="https://nodejs.org/download/release/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz"
download_and_extract $NODE_URL node-v${NODE_VERSION}-linux-x64.tar.gz node-v${NODE_VERSION}-linux-x64
echo "Copying node-v${NODE_VERSION}-linux-x64/bin/node"
cp node-v${NODE_VERSION}-linux-x64/bin/node ${SATDIR}/bin/

echo "Downloadind and building njs-client, installing node modules"
# NJS_CLIENT_URL="https://${BITBUCKET_USER}:${BITBUCKET_PASS}@bitbucket.org/datirium/scidapsatelliteinteractions/get/${NJS_CLIENT_VERSION}.tar.gz"
# download_and_extract $NJS_CLIENT_URL ${NJS_CLIENT_VERSION}.tar.gz datirium-scidapsatelliteinteractions-${NJS_CLIENT_VERSION}
# build_njs_client datirium-scidapsatelliteinteractions-${NJS_CLIENT_VERSION}/scidap-satellite  # need subdir from the repository
build_njs_client $NJS_REPO_PATH #/Users/scrowley/Desktop/REPOS/scidap-satellite-interactions/scidap-satellite

echo "Installing pm2"
install_pm2 ${SATDIR}


# echo "Downloading python and installing shiv for building cluster"
# PYTHON_URL="https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}.tgz"
# download_and_extract $PYTHON_URL
echo "Downloading cluster-api"
build_cluster_api $CLUSTER_REPO_PATH #/Users/scrowley/Desktop/REPOS/sat-cluster-api


echo "Downloading Aria2"
ARIA2_URL="https://github.com/q3aql/aria2-static-builds/releases/download/v${ARIA2_VERSION}/aria2-${ARIA2_VERSION}-linux-gnu-64bit-build1.tar.bz2"
download_and_extract $ARIA2_URL aria2-${ARIA2_VERSION}-linux-gnu-64bit-build1.tar.bz2 aria2-${ARIA2_VERSION}-linux-gnu-64bit-build1
echo "Copying aria2-${ARIA2_VERSION}-linux-gnu-64bit-build1/aria2c"
cp aria2-${ARIA2_VERSION}-linux-gnu-64bit-build1/aria2c ${SATDIR}/bin/


echo "Downloading SRA-Toolkit"                                           # need to copy some extra files as fastq-dump doesn't work without them)
SRA_TOOLKIT_URL="https://ftp-trace.ncbi.nlm.nih.gov/sra/sdk/${SRA_TOOLKIT_VERSION}/sratoolkit.${SRA_TOOLKIT_VERSION}-${SRA_TOOLKIT_SUFFIX}.tar.gz"
download_and_extract $SRA_TOOLKIT_URL sratoolkit.${SRA_TOOLKIT_VERSION}-${SRA_TOOLKIT_SUFFIX}.tar.gz sratoolkit.${SRA_TOOLKIT_VERSION}-${SRA_TOOLKIT_SUFFIX}
echo "Copying fastq-dump and related files"
cp -L sratoolkit.${SRA_TOOLKIT_VERSION}-${SRA_TOOLKIT_SUFFIX}/bin/fastq-dump ${SATDIR}/bin/
cp -L sratoolkit.${SRA_TOOLKIT_VERSION}-${SRA_TOOLKIT_SUFFIX}/bin/fastq-dump-orig.${SRA_TOOLKIT_VERSION} ${SATDIR}/bin/
cp -L sratoolkit.${SRA_TOOLKIT_VERSION}-${SRA_TOOLKIT_SUFFIX}/bin/vdb-config ${SATDIR}/bin/
cp -L sratoolkit.${SRA_TOOLKIT_VERSION}-${SRA_TOOLKIT_SUFFIX}/bin/vdb-config.${SRA_TOOLKIT_VERSION} ${SATDIR}/bin/

echo "Downloading PostgreSQL"
POSTGRESQL_URL="https://get.enterprisedb.com/postgresql/postgresql-${POSTGRESQL_VERSION}-1-linux-x64-binaries.tar.gz"
download_and_extract $POSTGRESQL_URL postgresql-${POSTGRESQL_VERSION}-1-linux-x64-binaries.tar.gz pgsql
echo "Copying PostgreSQL binaries, libs and shares"
cp -L pgsql/bin/initdb ${SATDIR}/bin/
cp -L pgsql/bin/createdb ${SATDIR}/bin/
cp -L pgsql/bin/pg_ctl ${SATDIR}/bin/
cp -L pgsql/bin/pg_isready ${SATDIR}/bin/
cp -L pgsql/bin/postgres ${SATDIR}/bin/
cp -L pgsql/bin/psql ${SATDIR}/bin/
cp -L pgsql/bin/psql.bin ${SATDIR}/bin/
cp -r pgsql/lib ${SATDIR}/
cp -r pgsql/share ${SATDIR}/

# echo "Downloading CWL-Airflow"
# CWLAIRFLOW_URL="https://github.com/Barski-lab/cwl-airflow/releases/download/${CWLAIRFLOW_VERSION}/python_${CWLAIRFLOW_PYTHON_VERSION}_cwl_airflow_master_linux.tar.gz"
# download_and_extract $CWLAIRFLOW_URL python_${CWLAIRFLOW_PYTHON_VERSION}_cwl_airflow_master_linux.tar.gz python3
# echo "Copying python3 to ${WORKDIR}/cwl-airflow"
# cp -r python3 cwl-airflow
# # patch cwltool so it always use docker for javascript evaluation. The normal node causes troubles when running from pm2 (perhaps somehow related to subprocesses?)
# SHORT_PYTHON_VERSION=$(echo ${CWLAIRFLOW_PYTHON_VERSION} | cut -d "." -f 1,2)
# sed -i -e 's/^    trynodes = ("nodejs", "node")/    trynodes = []/g' ./cwl-airflow/python${CWLAIRFLOW_PYTHON_VERSION}/opt/python${SHORT_PYTHON_VERSION}/lib/python${SHORT_PYTHON_VERSION}/site-packages/cwltool/sandboxjs.py
# # patch cwltool to have longer timeout for javascript evaluation as hardcoded 30 sec is not enough when starting multiple containers simultaniously
# sed -i -e '157i\ \ \ \ timeout = 600' ./cwl-airflow/python${CWLAIRFLOW_PYTHON_VERSION}/opt/python${SHORT_PYTHON_VERSION}/lib/python${SHORT_PYTHON_VERSION}/site-packages/cwltool/sandboxjs.py


echo "Copying start scripts"
cd ${WORKDIR}
cp -L ../start_scripts/start_postgres.sh ${SATDIR}/bin/
cp -L ../start_scripts/start_scheduler.sh ${SATDIR}/bin/
cp -L ../start_scripts/start_apiserver.sh ${SATDIR}/bin/
cp -L ../start_scripts/start_webserver.sh ${SATDIR}/bin/
cp -L ../start_scripts/start_cluster_api.sh ${SATDIR}/bin/
cp -L ../start_scripts/run_toil.sh ${SATDIR}/bin/

echo "Moving installed programs to the bundle folder, copying configuration files and utilities. Compressing results."
cd ${WORKDIR}
mv ${SATDIR} ../bundle
cp -L ../start_scripts/pm2 ../bundle/
cd ../bundle
mkdir configs utilities
cp ../configs/ecosystem.config.js ./configs/
cp ../configs/scidap_default_cluster_settings.json ./configs/scidap_default_settings.json
cp ../utilities/configure_cluster.js ./utilities/configure.js
tar -czf scidap-cluster-satellite-v${SATELLITE_VERSION_LABEL}-${DISTRO_TAG}.tar.gz ./*
rm -rf satellite configs utilities pm2 #cwl-airflow