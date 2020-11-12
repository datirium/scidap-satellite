#!/bin/bash

# echo $npm_package_version        # not sure if it's actually needed, so leave it unchanged

warn() { echo "$@" 1>&2; }

download_and_extract() {
  DOWNLOAD_URL=$1
  COMPRESSED_NAME=$2
  EXTRACTED_NAME=$3
  echo "Processing link $DOWNLOAD_URL"
  if [ -e $COMPRESSED_NAME ]; then
    warn "File $COMPRESSED_NAME already exist. Skipping download"
  else
    echo "Downloading $DOWNLOAD_URL"
    curl -L -O --fail $DOWNLOAD_URL
  fi
  if [ -e ${EXTRACTED_NAME} ]; then
    warn "Location $EXTRACTED_NAME already exist. Skipping extraction"
  else
    echo "Extracting $COMPRESSED_NAME"
    tar -zxvf $COMPRESSED_NAME > ${EXTRACTED_NAME}_exctraction.log 2>&1
  fi
}


# Setting up package versions
NODE_VERSION="12.16.3"
MONGO_VERSION="4.2.0"
ARIA2_VERSION="1.35.0"
CWLAIRFLOW_VERSION="1.2.6"
CWLAIRFLOW_PYTHON_VERSION="3.8"
CWLAIRFLOW_MACOS_VERSION="10.15.7"
BIOWARDROBE_NG_VERSION="2.0.0"
SRA_TOOLKIT_VERSION="2.10.8"


# Preparing working directory
rm -rf ../Services && mkdir -p ../Services
mkdir -p ../build && cd ../build && mkdir -p satellite
WORKDIR=$(pwd)
SATDIR=${WORKDIR}/satellite


# Downloading and building BioWardrobe-NG
cd ${WORKDIR}
BIOWARDROBE_NG_URL="https://github.com/Barski-lab/biowardrobe-ng/archive/${BIOWARDROBE_NG_VERSION}.tar.gz"
download_and_extract $BIOWARDROBE_NG_URL ${BIOWARDROBE_NG_VERSION}.tar.gz biowardrobe-ng-${BIOWARDROBE_NG_VERSION}
if [ -e $SATDIR/main.js ]; then
  warn "biowardrobe-ng-${BIOWARDROBE_NG_VERSION} has been already built. Skipping compilation"
else
  echo "Building biowardrobe-ng-${BIOWARDROBE_NG_VERSION}"
  cd biowardrobe-ng-${BIOWARDROBE_NG_VERSION}
  AOT=1 ROLLUP=0 meteor build --directory "${SATDIR}" > ${WORKDIR}/biowardrobe-ng-${BIOWARDROBE_NG_VERSION}_build.log 2>&1
  cd "${SATDIR}"
  mv bundle/* bundle/.node_version.txt .
  rm -rf bundle
  mkdir -p bin
  chmod -R u+w ${SATDIR}
fi


# Downloading Node and building node modules
cd ${WORKDIR}
NODE_URL="https://nodejs.org/download/release/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-x64.tar.gz"
download_and_extract $NODE_URL node-v${NODE_VERSION}-darwin-x64.tar.gz node-v${NODE_VERSION}-darwin-x64
if [ -e ${SATDIR}/bin/node ]; then
  warn "Node has been already copied. Skipping copy"
else
  echo "Copying node-v${NODE_VERSION}-darwin-x64/bin/node"
  cp node-v${NODE_VERSION}-darwin-x64/bin/node ${SATDIR}/bin/
fi
if [ -e ${SATDIR}/programs/server/node_modules ]; then
  warn "Node modules have been already installed. Skipping installation"
else
  echo "Installing node modules"
  TEMP_PATH=$PATH
  PATH="${WORKDIR}/node-v${NODE_VERSION}-darwin-x64/bin:/bin:/usr/bin"
  cd ${SATDIR}/programs/server
  npm install > ${WORKDIR}/node-v${NODE_VERSION}-darwin-x64_build.log 2>&1
  PATH=$TEMP_PATH
fi


# Downloading and copying MongoDB
cd ${WORKDIR}
MONGO_URL="https://fastdl.mongodb.org/osx/mongodb-macos-x86_64-${MONGO_VERSION}.tgz"
download_and_extract $MONGO_URL mongodb-macos-x86_64-${MONGO_VERSION}.tgz mongodb-macos-x86_64-${MONGO_VERSION}
if [ -e ${SATDIR}/bin/mongod ]; then
  warn "Mongod has been already copied. Skipping copy"
else
  echo "Copying mongodb-macos-x86_64-${MONGO_VERSION}/bin/mongod"
  cp mongodb-macos-x86_64-${MONGO_VERSION}/bin/mongod ${SATDIR}/bin/
fi


# Downloading and copying Aria2
cd ${WORKDIR}
ARIA2_URL="https://github.com/aria2/aria2/releases/download/release-${ARIA2_VERSION}/aria2-${ARIA2_VERSION}-osx-darwin.tar.bz2"
download_and_extract $ARIA2_URL aria2-${ARIA2_VERSION}-osx-darwin.tar.bz2 aria2-${ARIA2_VERSION}
if [ -e ${SATDIR}/bin/aria2c ]; then
  warn "Aria2c has been already copied. Skipping copy"
else
  echo "Copying aria2-${ARIA2_VERSION}"
  cp aria2-${ARIA2_VERSION}/bin/aria2c ${SATDIR}/bin/
fi


# Downloading and copying CWL-Airflow
cd ${WORKDIR}
CWLAIRFLOW_URL="https://github.com/Barski-lab/cwl-airflow/releases/download/${CWLAIRFLOW_VERSION}/python_${CWLAIRFLOW_PYTHON_VERSION}_with_cwl_airflow_master_macos_${CWLAIRFLOW_MACOS_VERSION}.tar.gz"
download_and_extract $CWLAIRFLOW_URL python_${CWLAIRFLOW_PYTHON_VERSION}_with_cwl_airflow_master_macos_${CWLAIRFLOW_MACOS_VERSION}.tar.gz python3
if [ -e ${WORKDIR}/cwl-airflow ]; then
  warn "CWL-Airflow folder has been already copied. Skipping copy"
else
  echo "Copying python3 to ${WORKDIR}/cwl-airflow"
  cp -r python3 cwl-airflow
fi


# Downloading and copying SRA-Toolkit
cd ${WORKDIR}
SRA_TOOLKIT_URL="http://ftp-trace.ncbi.nlm.nih.gov/sra/sdk/${SRA_TOOLKIT_VERSION}/sratoolkit.${SRA_TOOLKIT_VERSION}-mac64.tar.gz"
download_and_extract $SRA_TOOLKIT_URL sratoolkit.${SRA_TOOLKIT_VERSION}-mac64.tar.gz sratoolkit.${SRA_TOOLKIT_VERSION}-mac64
if [ -e ${SATDIR}/bin/fastq-dump ]; then
  warn "fastq-dump has been already copied. Skipping copy"
else
  echo "Copying sratoolkit.${SRA_TOOLKIT_VERSION}-mac64/bin/fastq-dump"
  cp -L sratoolkit.${SRA_TOOLKIT_VERSION}-mac64/bin/fastq-dump ${SATDIR}/bin/
fi


# Moving installed programs to the Services folder
cd ${WORKDIR}
mv cwl-airflow ${SATDIR} ../Services


# Not sure how it's going to be used, so leave it unchanged for now
cd $WORKDIR
if [ -e "webui-aria2" ]; then
  warn "webui-aria2 has been already istalled. Skipping installation"
else
  git clone https://github.com/ziahamza/webui-aria2
  cd webui-aria2
  npm install
  npm i node-sass
  npm run build
fi

if [ ! -e "../node_modules/mongo-express" ]; then
    cd ..
    npm install mongo-express
fi
cd $WORKDIR