FROM ubuntu:18.04

# Install base utilities
RUN apt-get update \
    && apt-get install -y build-essential \
    && apt-get install -y wget \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install miniconda
ENV CONDA_DIR /opt/conda
RUN wget --quiet https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O ~/miniconda.sh && \
    /bin/bash ~/miniconda.sh -b -p /opt/conda

# Put conda in path so we can use conda activate
ENV PATH=$CONDA_DIR/bin:$PATH


RUN conda create -n buildCluster python=3.6.8 
# RUN source ~/.bashrc
# RUN conda activate buildCluster
# RUN pip install shiv
RUN conda install -n buildCluster -c conda-forge shiv


# Make RUN commands use the new environment:
SHELL ["conda", "run", "-n", "buildCluster", "/bin/bash", "-c"]

# The code to run when container is started:
ENTRYPOINT ["conda", "run", "-n", "buildCluster"] 
#, "python3", "src/server.py"]