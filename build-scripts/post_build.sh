#!/bin/bash
echo $npm_package_version
pw=$(pwd)
sat=${pw}/satellite


die() { echo "$@" 1>&2; exit 1; }
warn() { echo "$@" 1>&2; }


#
#         COMPILE Biowardrobe NG
#

#git clone?
if [ -e "satellite" ]; then
  warn "Satellite already created please delete"
else
  cd ../../../barski-lab/biowardrobe-ng
  AOT=1 ROLLUP=0 meteor build --directory "${sat}"
  cd "${pw}"
  mv ${sat}/bundle/* ${sat}/bundle/.node_version.txt ${sat}
  rm -rf ${sat}/bundle/
  mkdir -p ${sat}/bin
fi

cd "${pw}"


#
#         DOWNLOAD NODE
#

NODE_VERSION="10.16.3"
NODE_HOME="${pw}/node-v${NODE_VERSION}-darwin-x64"
NODE_ARCH="node-v${NODE_VERSION}-darwin-x64.tar.gz"

if [ -e ${NODE_ARCH} ]; then
  warn "${NODE_ARCH} already exists: will not download"
else
  curl -O --fail https://nodejs.org/download/release/latest-v10.x/${NODE_ARCH}
fi

if [ -e ${NODE_HOME} ]; then
  warn "${NODE_HOME} exists skip untar"
else
  tar -zxvf ${NODE_ARCH} >${pw}/download.node.log 2>&1
  cp ${NODE_HOME}/bin/node ${sat}/bin/
fi


#
#         INSATLL SAT Modules!
#

ph=$PATH
PATH="${NODE_HOME}/bin/:/bin:/usr/bin"

if [ -e ${sat}/programs/server/node_modules ]; then
  warn "Satellite modules already installed"
else
  cd ${sat}/programs/server && ${NODE_HOME}/bin/npm install > ${pw}/install.npm.log 2>&1
fi

cd ${pw}
PATH=$ph


#
#   MONGODB
#

MONGO_VERSION="4.2.0"
MONGO_HOME="${pw}/mongodb-macos-x86_64-${MONGO_VERSION}"
MONGO_ARCH="mongodb-macos-x86_64-${MONGO_VERSION}.tgz"

if [ -e ${MONGO_ARCH} ]; then
  warn "${MONGO_ARCH} already exists: will not download"
else
  curl -O --fail https://fastdl.mongodb.org/osx/${MONGO_ARCH}
fi

if [ -e ${MONGO_HOME} ]; then
  warn "${MONGO_HOME} exists skip untar"
else
  tar -zxvf ${MONGO_ARCH} >/dev/null 2>&1
  mv ${MONGO_HOME}/bin/mongod ${MONGO_HOME}/bin/mongodump ${MONGO_HOME}/bin/mongorestore ${sat}/bin
fi

#
#  ARIA2
#

ARIA2_VERSION="1.34.0"
ARIA2_ARCH="aria2-${ARIA2_VERSION}.tar.xz"
ARIA2_SRC="${pw}/aria2-${ARIA2_VERSION}"
ARIA2_HOME="${pw}/aria2c"

if [ -e ${ARIA2_ARCH} ]; then
  warn "${ARIA2_ARCH} already exists: will not download"
else
  curl -L -O --fail https://github.com/aria2/aria2/releases/download/release-${ARIA2_VERSION}/${ARIA2_ARCH}
fi

if [ -e ${ARIA2_SRC} ]; then
  warn "${ARIA2_SRC} exists skip untar"
else
  tar -zxvf ${ARIA2_ARCH} >/dev/null 2>&1
  cd ${ARIA2_SRC}
  # depends_on "pkg-config" => :build
  # depends_on "libssh2"

  sed -i'' -e 's/make_unique/std::make_unique/g' src/bignum.h
  sed -i'' -e 's/-std=c++11/-std=c++14/g' configure
  CPPFLAGS=-I/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/usr/include/libxml2 \
  ./configure  --disable-dependency-tracking \
      --enable-static=yes \
      --enable-shared=no \
      --prefix=${ARIA2_HOME} \
      --with-appletls \
      --without-libssh2 \
      --without-libcares \
      --without-openssl \
      --without-gnutls \
      --without-libgmp \
      --without-libnettle \
      --without-libgcrypt \
      ARIA2_STATIC=yes > ${pw}/install.aria2c.log 2>&1
  make -j >> ${pw}/install.aria2c.log 2>&1
fi

if [ -e ${ARIA2_SRC}/src/aria2c ]; then
  strip ${ARIA2_SRC}/src/aria2c
  cp ${ARIA2_SRC}/src/aria2c ${sat}/bin
fi

#
#  CWL AIRFLOW
#

CWLAIRFLOW_VERSION="1.1.9"
CWLAIRFLOW_ARCH="cwl-airflow.macos.tar.gz"
CWLAIRFLOW_HOME="${pw}/cwl-airflow.app"
CWLAIRFLOW_HOME_N="${pw}/cwl-airflow"

if [ -e ${CWLAIRFLOW_ARCH} ]; then
  warn "${CWLAIRFLOW_ARCH} already exists: will not download"
else
  curl -L -O --fail https://github.com/Barski-lab/cwl-airflow/releases/download/${CWLAIRFLOW_VERSION}/cwl-airflow.macos.tar.gz
fi

if [ -e ${CWLAIRFLOW_HOME_N} ]; then
  warn "${CWLAIRFLOW_HOME} already exists: will not un tar"
else
  tar -zxvf ${CWLAIRFLOW_ARCH} >/dev/null 2>&1
  mv ${CWLAIRFLOW_HOME} ${CWLAIRFLOW_HOME_N}
  mv ${CWLAIRFLOW_HOME_N}/Contents/* ${CWLAIRFLOW_HOME_N}/
fi

mv ${CWLAIRFLOW_HOME_N} ${sat} ../Services

cd $pw