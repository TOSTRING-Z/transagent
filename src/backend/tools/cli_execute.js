const { exec } = require('child_process');
const { tmpdir } = require('os');
const { writeFileSync, unlinkSync } = require('fs');
const path = require('path');
const fs = require('fs');
const { BrowserWindow, ipcMain } = require('electron');
const { Client } = require('ssh2');
const { utils } = require('../modules/globals');

function threshold(data, threshold) {
    if (!!data && data?.length > threshold) {
        return "Returned content is too large, please try another solution!";
    } else {
        return data;
    }
}

let cli_prompt = `The current tools can be used for complex bioinformatics analysis pipelines, including sophisticated data analysis, plotting, and system-level command execution. The installed software includes:  

- **HOMER**: Used for ChIP-seq and motif analysis.  
  *Example*: findMotifsGenome.pl input.bed hg38 output_dir -size 200 -mask  

- **ChIPseeker**: Used for annotating ChIP-seq data.  
  *Example*: mkdir -p output_dir && Rscript -e 'library(ChIPseeker); peakAnno <- annotatePeak("input.bed", tssRegion=c(-1000, 1000), TxDb=TxDb.Hsapiens.UCSC.hg38.knownGene); write.csv(peakAnno@annoStat,"output_dir/ChIPseeker_annoStat.csv")'  

- **UCSC LiftOver**: Used for genomic coordinate conversion.  
  *Example*: liftOver input.bed /data/bam2bw/hg19ToHg38.over.chain.gz output.bed unmapped.bed  

- **BETA**: Identifies target genes using only binding data (regulatory potential score).  
  *Example*: awk '{print $1"\t"$2"\t"$3}' input.bed > BETA_input.bed && BETA minus -p BETA_input.bed -g hg38 -n BETA_targets -o output_dir  

- **FastQC**: Used for sequencing data quality control.  
  *Example*: fastqc seq.fastq -o output_dir  

- **Trim Galore**: Used for adapter trimming in sequencing data.  
  *Example*: trim_galore --paired --quality 20 --length 20 read1.fastq read2.fastq  

- **Bowtie2**: Used for sequence alignment.  
  *Example*: bowtie2 -x index -1 read1.fastq -2 read2.fastq -S output.sam  

- **Picard**: Used for processing high-throughput sequencing data.  
  *Example*: picard MarkDuplicates I=input.bam O=marked_duplicates.bam M=metrics.txt  

- **MACS2**: Used for ChIP-seq peak calling.  
  *Example*: macs2 callpeak -t ChIP.bam -c Control.bam -f BAM -g hs -n output_prefix  

- **DeepTools**: Used for visualizing high-throughput sequencing data.  
  *Example*: computeMatrix reference-point --referencePoint TSS -b 1000 -a 1000 -R input.bed -S input.bw -out matrix.gz && plotProfile -m matrix.gz --plotTitle "final profile" --plotFileFormat svg -out output.svg  

- **Pandas**: Used for data analysis and manipulation.  
  *Example*: python -c 'import pandas as pd; df = pd.read_csv("data.csv"); print(df.head())'  

- **Seaborn**: Used for data visualization.  
  *Example*: python -c 'import seaborn as sns; tips = sns.load_dataset("tips"); sns.boxplot(x="day", y="total_bill", data=tips)'`;

function main(params) {
    if (!!params.cli_prompt && fs.existsSync(params.cli_prompt)) {
        cli_prompt = fs.readFileSync(params.cli_prompt, 'utf-8');
    }
    return async ({ code }) => {
        // Create temporary file
        const tempFile = path.join(tmpdir(), `temp_${Date.now()}.sh`)
        if (!!params?.bashrc) {
            code = `source ${params.bashrc};\n${code}`;
        }
        writeFileSync(tempFile, code)
        console.log(tempFile)

        // Create terminal window
        let terminalWindow = null;
        terminalWindow = new BrowserWindow({
            width: 800,
            height: 600,
            frame: false, // 隐藏默认标题栏和边框
            transparent: true, // 可选：实现透明效果
            resizable: true, // 允许调整窗口大小
            icon: path.join(__dirname, 'icon/icon.ico'),
            webPreferences: {
                // devTools: true, // 保持 DevTools 开启
                nodeIntegration: true,
                contextIsolation: false // 允许在渲染进程使用Electron API
            }
        });

        terminalWindow.loadFile('src/frontend/terminal.html');

        ipcMain.on('minimize-window', () => {
            terminalWindow?.minimize()
        })

        ipcMain.on('close-window', () => {
            terminalWindow?.close()
        })

        return new Promise((resolve, reject) => {
            let output = null;
            let error = null;
            const sshConfig = utils.getSshConfig();
            if (!!sshConfig) {
                const conn = new Client();

                conn.on('ready', () => {
                    console.log('SSH Connection Ready');
                    conn.exec(code, (err, stream) => {
                        if (err) {
                            error = err.message;
                            resolve(JSON.stringify({
                                success: false,
                                output: threshold(output, params.threshold),
                                error: error
                            }));
                        }

                        stream.on('close', (code, signal) => {
                            console.log(`命令执行完毕: 退出码 ${code}, 信号 ${signal}`);
                            conn.end(); // 关闭连接
                            unlinkSync(tempFile);
                            setTimeout(() => {
                                if (!!terminalWindow)
                                    terminalWindow.close();
                                resolve(JSON.stringify({
                                    success: code === 0,
                                    output: threshold(output, params.threshold),
                                    error: error
                                }));
                            }, params.delay_time * 1000);
                        })

                        stream.stdout.on('data', (data) => {
                            output = data.toString();
                            terminalWindow.webContents.send('terminal-data', output);
                        })

                        stream.stderr.on('data', (data) => {
                            error = data.toString();
                            terminalWindow.webContents.send('terminal-data', error);
                        });

                        ipcMain.on('terminal-input', (event, input) => {
                            if (!input) {
                                stream.end()
                            } else {
                                stream.write(input)
                            }
                        });

                        ipcMain.on('terminal-signal', (event, input) => {
                            switch (input) {
                                case "ctrl_c":
                                    conn.end();
                                    stream.close();
                                    break;

                                default:
                                    break;
                            }
                        });
                    })
                })
                    .on('error', (err) => {
                        console.error('Connection Error:', err);
                        return err.message;
                    })
                    .on('close', () => {
                        console.log('Connection Closed');
                    })
                    .connect(sshConfig);

            } else {
                const child = exec(`${params.bash} ${tempFile}`);
                child.stdout.on('data', (data) => {
                    output = data.toString();
                    terminalWindow.webContents.send('terminal-data', output);
                });

                child.stderr.on('data', (data) => {
                    error = data.toString();
                    terminalWindow.webContents.send('terminal-data', error);
                });

                child.on('close', (code) => {
                    unlinkSync(tempFile);
                    setTimeout(() => {
                        if (!!terminalWindow)
                            terminalWindow.close();
                        resolve(JSON.stringify({
                            success: code === 0,
                            output: threshold(output, params.threshold),
                            error: error
                        }));
                    }, params.delay_time * 1000);
                });

                ipcMain.on('terminal-input', (event, input) => {
                    if (!input) {
                        child.stdin.end();
                    } else {
                        child.stdin.write(`${input}`);
                    }
                });

                ipcMain.on('terminal-signal', (event, input) => {
                    switch (input) {
                        case "ctrl_c":
                            child.kill();
                            break;

                        default:
                            break;
                    }
                });
            }

            terminalWindow.on('close', () => {
                terminalWindow = null;
            })
        });
    }
}

function getPrompt() {
    const prompt = `## cli_execute
Description: ${cli_prompt}
Parameters:
- code: (Required) Executable bash code snippet (please strictly follow the code format, incorrect indentation and line breaks will cause code execution to fail)
Usage:
{
  "thinking": "[Thinking process]",
  "tool": "cli_execute",
  "params": {
    "code": "[value]"
  }
}`
    return prompt
}

module.exports = {
    main, getPrompt
};
