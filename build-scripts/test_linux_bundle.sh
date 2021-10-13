#!/bin/bash

BUNDLE_PATH=$1
TEST_CONTAINER=$2
REPO_URL=${3:-"https://github.com/datirium/workflows.git"}
SUITE=${4:-"tests/conformance_tests.yaml"}
PARAMS=${5:-"--range=1"}

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
echo "Testing SciDAP-Satellite Linux bundle with ${SUITE} from the ${REPO_URL} in container ${TEST_CONTAINER}"

TEMP="${DIR}/temp"
echo "Cleaning temporary directory ${TEMP}"
rm -rf ${TEMP} && mkdir ${TEMP}

echo "Killing test_linux_bundle docker container"
docker kill test_linux_bundle > /dev/null 2>&1

echo "Copying SciDAP-Satellite Linux bundle from ${BUNDLE_PATH} to ${TEMP}"
cd ${TEMP}
cp ${BUNDLE_PATH} .

REPO_FOLDER=`basename ${REPO_URL}`
REPO_FOLDER="${REPO_FOLDER%.*}"      # to exclude possible .git in the url

echo "Starting docker container ${TEST_CONTAINER}"
if [[ $TEST_CONTAINER == *"centos"* ]]; then
    docker run --rm -d \
        --volume /var/run/docker.sock:/var/run/docker.sock \
        --volume "$TEMP":"$TEMP" \
        --volume "$TEMP/airflow":"/home/scidap/scidap/airflow" \
        --volume "$TEMP/pgdata":"/home/scidap/scidap/pgdata" \
        --name test_linux_bundle \
        ${TEST_CONTAINER} \
        /bin/bash -c "
            yum install yum-utils -y;
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo;
            yum install docker-ce-cli git -y;
            adduser scidap;
            usermod -aG docker scidap;
            newgrp docker;
            chown scidap /var/run/docker.sock;
            chown -R scidap /home/scidap;
            chown -R scidap ${TEMP};
            while true; do sleep 1; done;
        "
elif [[ $TEST_CONTAINER == *"ubuntu"* ]]; then
    if [[ $TEST_CONTAINER == *"18.04"* ]]; then
        LSB_RELEASE="bionic"
    elif [[ $TEST_CONTAINER == *"20.04"* ]]; then
        LSB_RELEASE="focal"
    else
        echo "Failed to identify Ubuntu code name for $TEST_CONTAINER. Exiting."
        exit 1
    fi
    docker run --rm -d \
        --volume /var/run/docker.sock:/var/run/docker.sock \
        --volume "$TEMP":"$TEMP" \
        --volume "$TEMP/airflow":"/home/scidap/scidap/airflow" \
        --volume "$TEMP/pgdata":"/home/scidap/scidap/pgdata" \
        --env DEBIAN_FRONTEND=noninteractive \
        --name test_linux_bundle \
        ${TEST_CONTAINER} \
        /bin/bash -c "
            apt-get update;
            apt-get install apt-transport-https ca-certificates curl gnupg lsb-core lsb-release -y;
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg;
            echo 'deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $LSB_RELEASE stable' | tee /etc/apt/sources.list.d/docker.list > /dev/null;
            apt-get update;
            apt-get install docker-ce-cli git -y;
            adduser scidap;
            groupadd docker;
            usermod -aG docker scidap;
            newgrp docker;
            chown scidap /var/run/docker.sock;
            chown -R scidap /home/scidap;
            chown -R scidap ${TEMP};
            while true; do sleep 1; done;
        "
else
  echo "Failed to identify OS of ${TEST_CONTAINER} container. Exiting."
  exit 1
fi

echo "Waiting 120 sec to make sure docker container is properly started and scidap user is created"
sleep 120

docker exec \
    --user scidap \
    --env TMPDIR="${TEMP}/tmp" \
    --env AIRFLOW__CWL__TMP_FOLDER="${TEMP}/tmp" \
    --env PM2_HOME="${TEMP}/pm2_home" \
    --env AIRFLOW_HOME="/home/scidap/scidap/airflow" \
    --env AIRFLOW__CORE__HOSTNAME_CALLABLE="socket.gethostname" \
    --env AIRFLOW__CORE__SQL_ALCHEMY_CONN="postgresql+psycopg2://airflow:airflow@127.0.0.1:5432/airflow" \
    --env AIRFLOW__CORE__EXECUTOR="LocalExecutor" \
    test_linux_bundle \
    /bin/bash -c "
        cd $TEMP;
        mkdir -p satellite_latest;
        cd satellite_latest;
        echo 'Unpacking tar.gz';
        tar xzf ../*.tar.gz;
        cd $TEMP;
        echo 'Cloning workflows';
        git clone $REPO_URL --recursive;
        cd $TEMP;
        $TEMP/satellite_latest/pm2 start $TEMP/satellite_latest/configs/ecosystem.config.js;
        echo 'Waiting 120 seconds to make sure pm2 services are properly started';
        sleep 120;
        $TEMP/satellite_latest/cwl-airflow/bin_portable/cwl-airflow test --api http://127.0.0.1:8080 --host 127.0.0.1 --port 3069 --suite $TEMP/$REPO_FOLDER/$SUITE $PARAMS > $TEMP/cwl_airflow_test.log
    "

EXIT_CODE=`echo $?`
docker kill test_linux_bundle
exit ${EXIT_CODE}