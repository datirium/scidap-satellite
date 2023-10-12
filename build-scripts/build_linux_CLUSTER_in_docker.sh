#!/usr/bin/env bash

CLUSTER_REPO_PATH=${1:-"/Users/scrowley/Desktop/REPOS/sat-cluster-api"}
NJS_REPO_PATH=${2:-"/Users/scrowley/Desktop/REPOS/scidap-satellite-interactions/scidap-satellite"}

BUILD_CONTAINER=${3:-"ubuntu:18.04"}                          # ubuntu or centos images (centos:7, centos:8, ubuntu:18.04, ubuntu:20.04)
SATELLITE_VERSION_LABEL=${4:-`git rev-parse HEAD`}            # For tagging purpose only (use current commit be default). We always mount the content of the local build-scripts directory.
NODE_VERSION=${5:-"12.22.7"}
ARIA2_VERSION=${6:-"1.36.0"}
# CWLAIRFLOW_VERSION=${5:-"1.2.11"}
# CWLAIRFLOW_PYTHON_VERSION=${6:-"3.8.12"}
# NJS_CLIENT_VERSION=${7:-"master"}                       # No local builds. Always pulled from BitBucket. All the changes should be pushed beforehand.
SRA_TOOLKIT_VERSION=${7:-"2.11.1"}
POSTGRESQL_VERSION=${8:-"10.18"}                              # see https://www.enterprisedb.com/download-postgresql-binaries for available versions
# PYTHON_VERSION=${9:-"3.6.8"}

# if [[ -z "${BITBUCKET_USER}" ]] || [[ -z "${BITBUCKET_PASS}" ]]; then
#   echo "BITBUCKET_USER and/or BITBUCKET_PASS are not set as environment variables."
#   echo "We won't be able to build NJS-Client. Exiting."
#   exit 1
# fi

WORKING_DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
echo "Packing SciDAP satellite linux bundle (${SATELLITE_VERSION_LABEL}) in dockerized $BUILD_CONTAINER"
echo "Current working directory ${WORKING_DIR}"
echo "Starting $BUILD_CONTAINER docker container with the following parameters:"
echo "  SATELLITE_VERSION_LABEL=${SATELLITE_VERSION_LABEL}"
echo "  NODE_VERSION=${NODE_VERSION}"
echo "  ARIA2_VERSION=${ARIA2_VERSION}"
# echo "  CWLAIRFLOW_VERSION=${CWLAIRFLOW_VERSION}"
# echo "  CWLAIRFLOW_PYTHON_VERSION=${CWLAIRFLOW_PYTHON_VERSION}"
# echo "  NJS_CLIENT_VERSION=${NJS_CLIENT_VERSION}"
echo "  SRA_TOOLKIT_VERSION=${SRA_TOOLKIT_VERSION}"
echo "  POSTGRESQL_VERSION=${POSTGRESQL_VERSION}"

sleep 2

docker run --rm -it \
       --volume ${WORKING_DIR}:/tmp \
       --volume ${CLUSTER_REPO_PATH}:/cluster-repo \
       --volume ${NJS_REPO_PATH}:/njs-repo \
       --workdir /tmp \
       ${BUILD_CONTAINER} \
       /tmp/build_linux_CLUSTER.sh \
       ${SATELLITE_VERSION_LABEL} \
       ${NODE_VERSION} \
       ${ARIA2_VERSION} \
       ${SRA_TOOLKIT_VERSION} \
       ${POSTGRESQL_VERSION} \
       /cluster-repo \
       /njs-repo