#!/bin/bash

ln -s /data/rose/* /root/
ln -s /data/rgtdata /root/
rm -rf /opt/conda && ln -s /data/conda /opt/conda

. /opt/conda/etc/profile.d/conda.sh
conda activate
service ssh start
/app/.venv/bin/python /app/server.py