#!/bin/bash 

# using absolute paths

# will have /PROJ_ID/SAMP_ID appended for each sample run given
OUTPUT_DIR="${OUTPUT_DIR:="/home/scidap/scidap/projects"}"
# will use 'run_toil.sh' script in this dir (should be satellite bin)
SCRIPT_DIR="${SCRIPT_DIR:="/home/scidap/satellite/satellite/bin"}" 
TMP_TOIL_DIR="${TMP_TOIL_DIR:="/mnt/cache/TMP_TOIL_DIR"}"

echo "Starting Cluster API for cwl-toil"
start-cluster-api $OUTPUT_DIR $SCRIPT_DIR $TMP_TOIL_DIR
