
#!/bin/bash
set -e

WORKFLOW=$1
JOB=$2
OUTDIR=$3
TMPDIR=$4 # must be accessible by all nodes /data/barskilab/michael/toil_temp
DAG_ID=$5
RUN_ID=$6
MEMORY=${7:-"68719476736"}
CPU=${8:-"8"}


# remove file formats from cwl
sed -i '/format: /d' $WORKFLOW

JOBSTORE="${TMPDIR}/jobstore"
LOGS="${TMPDIR}/logs/${DAG_ID}_${RUN_ID}"


cleanup()
{
  EXIT_CODE=$?
  echo "Sending workflow execution error"
  PAYLOAD="{\"payload\":{\"dag_id\": \"${DAG_ID}\", \"run_id\": \"${RUN_ID}\", \"state\": \"failed\", \"progress\": 0, \"error\": \"failed\", \"statistics\": \"\", \"logs\": \"\"}}"
  echo $PAYLOAD
  curl -X POST http://localhost:3069/airflow/progress -H "Content-Type: application/json" -d "${PAYLOAD}"
  exit ${EXIT_CODE}
}
trap cleanup SIGINT SIGTERM SIGKILL ERR

/cm/shared/apps/lsf10/10.1/linux3.10-glibc2.17-x86_64/bin/bsub -J "${DAG_ID}_${RUN_ID}" \
     -M 16000 \
     -W 48:00 \
     -n 4 \
     -R "rusage[mem=16000] span[hosts=1]" \
     -o "${OUTDIR}/stdout.txt" \
     -e "${OUTDIR}/stderr.txt" << EOL
module purge
module load nodejs anaconda3 singularity/3.7.0
source /data/barskilab/temporary/myenv/bin/activate
mkdir -p ${OUTDIR} ${TMPDIR} ${JOBSTORE} ${LOGS}
export TMPDIR="${TMPDIR}"
export TOIL_LSF_ARGS="-W 48:00"
toil-cwl-runner \
--logDebug \
--bypass-file-store \
--batchSystem lsf \
--singularity \
--retryCount 0 \
--clean always \
--disableCaching \
--defaultMemory ${MEMORY} \
--defaultCores ${CPU} \
--jobStore "${JOBSTORE}/${DAG_ID}_${RUN_ID}" \
--writeLogs ${LOGS} \
--outdir ${OUTDIR} ${WORKFLOW} ${JOB} > ${OUTDIR}/results.json
EOL


/cm/shared/apps/lsf10/10.1/linux3.10-glibc2.17-x86_64/bin/bwait -w "started(${DAG_ID}_${RUN_ID})"
echo "Sending workflow execution progress"
PAYLOAD="{\"payload\":{\"dag_id\": \"${DAG_ID}\", \"run_id\": \"${RUN_ID}\", \"state\": \"Sent to Cluster\", \"progress\": 8, \"error\": \"\", \"statistics\": \"\", \"logs\": \"\"}}"
echo $PAYLOAD
curl -X POST http://localhost:3069/airflow/progress -H "Content-Type: application/json" -d "${PAYLOAD}"

/cm/shared/apps/lsf10/10.1/linux3.10-glibc2.17-x86_64/bin/bwait -w "done(${DAG_ID}_${RUN_ID})"      # won't be caught by trap if job finished successfully

RESULTS=`cat ${OUTDIR}/results.json`
PAYLOAD="{\"payload\":{\"dag_id\": \"${DAG_ID}\", \"run_id\": \"${RUN_ID}\", \"results\": $RESULTS}}"
echo "Sending workflow execution results from ${OUTDIR}/results.json"
echo $PAYLOAD
curl -X POST http://localhost:3069/airflow/results -H "Content-Type: application/json" -d "${PAYLOAD}"