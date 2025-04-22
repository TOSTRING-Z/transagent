# 初始化 conda
source /opt/conda/etc/profile.d/conda.sh

# 激活 conda 基础环境
conda activate

# 添加必要的路径到 PATH
export PATH="$PATH:/opt/conda/envs/beta_chip/bin:/opt/conda/envs/cutadapt/bin:/data/trim_galore/"

export LD_LIBRARY_PATH=/data/conda/lib/jvm/lib:$LD_LIBRARY_PATH