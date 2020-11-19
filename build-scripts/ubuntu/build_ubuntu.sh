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
    tar -zxvf $COMPRESSED_NAME > ${EXTRACTED_NAME}_extraction.log 2>&1
  fi
}

build_biowardobe_ng() {
  TEMP_PATH=$PATH
  PATH="${WORKDIR}/node-v${NODE_VERSION}-linux-x64/bin:/bin:/usr/bin:/usr/local/bin"
  echo "Building biowardrobe-ng from $1"
  cd $1
  npm install > ${WORKDIR}/npm_install.log 2>&1
  AOT=1 ROLLUP=0 meteor build --directory "${SATDIR}" > ${WORKDIR}/biowardrobe_ng_build.log 2>&1 
  cd "${SATDIR}"
  mv bundle/* bundle/.node_version.txt .
  rm -rf bundle
  chmod -R u+w ${SATDIR}
  echo "Installing node modules"
  cd ${SATDIR}/programs/server
  npm install >> ${WORKDIR}/npm_install.log 2>&1
  cd ${WORKDIR}
  PATH=$TEMP_PATH
}


# Setting up package versions
NODE_VERSION="12.19.0"
MONGO_VERSION="4.2.10"
ARIA2_VERSION="1.35.0"
CWLAIRFLOW_VERSION="1.2.6"
CWLAIRFLOW_PYTHON_VERSION="3.6"
UBUNTU_VERSION="18.04"
BIOWARDROBE_NG_VERSION="2.0.0"
SRA_TOOLKIT_VERSION="2.10.8"


# Loading variables from .env if provided
# Can be used for redefining package versions from above
# and setting BIOWARDROBE_NG_LOCAL_PATH for building
# BioWardrobe-NG from the local path
if [ -e .env ]; then
  echo "Loading variables from .env"
  export $(egrep -v '^#' .env | xargs)
fi


# Preparing working directory
rm -rf ../ubuntu_post_build && mkdir -p ../ubuntu_post_build
mkdir -p ../build/satellite/bin && cd ../build/
WORKDIR=$(pwd)
SATDIR=${WORKDIR}/satellite


# Downloading Node
if [ -e ${SATDIR}/bin/node ]; then
  warn "Node has been already copied. Skipping"
else
  NODE_URL="https://nodejs.org/download/release/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz"
  download_and_extract $NODE_URL node-v${NODE_VERSION}-linux-x64.tar.gz node-v${NODE_VERSION}-linux-x64
  echo "Copying node-v${NODE_VERSION}-linux-x64/bin/node"
  cp node-v${NODE_VERSION}-linux-x64/bin/node ${SATDIR}/bin/
fi


# Downloadind and compiling biowardrobe-ng, installing node modules
if [ -e ${SATDIR}/main.js ]; then
  warn "biowardrobe-ng has been already built. Skipping"
else
  if [ -n "$BIOWARDROBE_NG_LOCAL_PATH" ]; then
    # Building BioWardrobe-NG from the local path, BIOWARDROBE_NG_VERSION is not used
    build_biowardobe_ng ${BIOWARDROBE_NG_LOCAL_PATH}
  else
    # Downloading and building BioWardrobe-NG from the GitHub release BIOWARDROBE_NG_VERSION
    BIOWARDROBE_NG_URL="https://github.com/Barski-lab/biowardrobe-ng/archive/${BIOWARDROBE_NG_VERSION}.tar.gz"
    download_and_extract $BIOWARDROBE_NG_URL ${BIOWARDROBE_NG_VERSION}.tar.gz biowardrobe-ng-${BIOWARDROBE_NG_VERSION}
    build_biowardobe_ng biowardrobe-ng-${BIOWARDROBE_NG_VERSION}
  fi
fi


# Downloading MongoDB
if [ -e ${SATDIR}/bin/mongod ]; then
  warn "Mongod has been already copied. Skipping"
else
  UBUNTU_VERSION_WITHOUT_DOT="${UBUNTU_VERSION//./}"
  MONGO_URL="https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu${UBUNTU_VERSION_WITHOUT_DOT}-${MONGO_VERSION}.tgz"
  download_and_extract $MONGO_URL mongodb-linux-x86_64-ubuntu${UBUNTU_VERSION_WITHOUT_DOT}-${MONGO_VERSION}.tgz mongodb-linux-x86_64-ubuntu${UBUNTU_VERSION_WITHOUT_DOT}-${MONGO_VERSION}
  echo "Copying mongodb-linux-x86_64-ubuntu${UBUNTU_VERSION_WITHOUT_DOT}-${MONGO_VERSION}/bin/mongod"
  cp mongodb-linux-x86_64-ubuntu${UBUNTU_VERSION_WITHOUT_DOT}-${MONGO_VERSION}/bin/mongod ${SATDIR}/bin/
fi


# Downloading and compiling Aria2
if [ -e ${SATDIR}/bin/aria2c ]; then
  warn "Aria2c has been already compiled. Skipping"
else
  ARIA2_URL="https://github.com/aria2/aria2/releases/download/release-${ARIA2_VERSION}/aria2-${ARIA2_VERSION}.tar.gz"
  download_and_extract $ARIA2_URL aria2-${ARIA2_VERSION}.tar.gz aria2-${ARIA2_VERSION}
  echo "Compiling aria2-${ARIA2_VERSION}"
  cd aria2-${ARIA2_VERSION}
  ./configure --disable-dependency-tracking \
      --enable-static=yes \
      --enable-shared=no \
      --prefix=${WORKDIR}/aria2-${ARIA2_VERSION} \
      --with-openssl \
      --without-libssh2 \
      --without-libcares \
      --without-gnutls \
      --without-libgmp \
      --without-libnettle \
      --without-libgcrypt \
      ARIA2_STATIC=yes > ${WORKDIR}/aria2-${ARIA2_VERSION}_build.log 2>&1
  make -j 4 >> ${WORKDIR}/aria2-${ARIA2_VERSION}_build.log 2>&1
  cp ./src/aria2c ${SATDIR}/bin/
fi


# Downloading CWL-Airflow
if [ -e ${WORKDIR}/cwl-airflow ]; then
  warn "CWL-Airflow folder has been already copied. Skipping"
else
  CWLAIRFLOW_URL="https://github.com/Barski-lab/cwl-airflow/releases/download/${CWLAIRFLOW_VERSION}/python_${CWLAIRFLOW_PYTHON_VERSION}_with_cwl_airflow_master_ubuntu_${UBUNTU_VERSION}.tar.gz"
  download_and_extract $CWLAIRFLOW_URL python_${CWLAIRFLOW_PYTHON_VERSION}_with_cwl_airflow_master_ubuntu_${UBUNTU_VERSION}.tar.gz python3
  echo "Copying python3 to ${WORKDIR}/cwl-airflow"
  cp -r python3 cwl-airflow
fi


# Downloading SRA-Toolkit
if [ -e ${SATDIR}/bin/fastq-dump ]; then
  warn "fastq-dump has been already copied. Skipping"
else
  SRA_TOOLKIT_URL="http://ftp-trace.ncbi.nlm.nih.gov/sra/sdk/${SRA_TOOLKIT_VERSION}/sratoolkit.${SRA_TOOLKIT_VERSION}-ubuntu64.tar.gz"
  download_and_extract $SRA_TOOLKIT_URL sratoolkit.${SRA_TOOLKIT_VERSION}-ubuntu64.tar.gz sratoolkit.${SRA_TOOLKIT_VERSION}-ubuntu64
  echo "Copying sratoolkit.${SRA_TOOLKIT_VERSION}-ubuntu64/bin/fastq-dump"
  cp -L sratoolkit.${SRA_TOOLKIT_VERSION}-ubuntu64/bin/fastq-dump ${SATDIR}/bin/
fi


# Moving installed programs to the ubuntu_post_build folder, copying configuration files. Compressing results
cd ${WORKDIR}
mv cwl-airflow ${SATDIR} ../ubuntu_post_build
cd ../ubuntu_post_build
cp ../ubuntu/ecosystem.config.js .
cp ../ubuntu/meteor_default_settings.json .
tar -czf scidap-satellite.tar.gz ./*