const path = require("path");
const ytdl = require("ytdl-core");
const ffmpeg = require("ffmpeg-static");
const { spawn } = require("child_process");
const fs = require("fs");
const videoURL = fs.readFileSync(path.resolve(__dirname, 'link.txt'), 'utf8');

const start = async () => {
    if (!fs.existsSync("cache")) {
        fs.mkdirSync("cache");
    }

    const video = ytdl(videoURL, { quality: "highestvideo" });
    const audio = ytdl(videoURL, { quality: "highestaudio" });

    let title = "test";
    let downlanded = 0;
    let totalSize = 0;

    video.on('info', (info, format) => {
        title = info.videoDetails.title;
        totalSize += parseInt(format.contentLength);
    });

    video.on("data", (chunk) => {
        downlanded += chunk.length;
        const percent = (downlanded / totalSize) * 100;
        console.log(percent.toFixed(2)+ " %");
    });

    audio.on('info', (info, format) => {
        totalSize += parseInt(format.contentLength);
    });

    audio.on("data", (chunk) => {
        downlanded += chunk.length;
    });

    video.pipe(fs.createWriteStream("cache/video.cache"));
    audio.pipe(fs.createWriteStream("cache/audio.cache"));

    video.on('end', () => {
        const ffmpegCommand = [
            '-i', 'cache/video.cache',
            '-i', 'cache/audio.cache',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-strict', 'experimental',
            `${title}.mp4`
        ];

        const ffmpegProcess = spawn(ffmpeg, ffmpegCommand);

        ffmpegProcess.stderr.on('data', (data) => {
            const str = data.toString();
            const match = str.match(/time=(\d\d:\d\d:\d\d.\d\d)/);
            if (match) {
                const currentTime = match[1];
                console.log(`Przetwarzanie: ${currentTime}`);
            }
        });

        ffmpegProcess.on('close', (code) => {
            if (code === 0) {
                console.log('Operacja ffmpeg zakończona pomyślnie!');
                fs.rm("cache", { recursive: true }, (err) => {
                    if (err) {
                        console.error(err.message);
                        return;
                    }
                    console.log("Pliki cache usunięte!");
                });
            } else {
                console.error(`Błąd podczas operacji ffmpeg. Kod błędu: ${code}`);
            }
        });
    });
}
start();