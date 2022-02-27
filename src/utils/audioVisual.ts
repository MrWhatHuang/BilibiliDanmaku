interface optionInterface {
    accuracy: number, // 精度,实际表现为波形柱的个数，范围16-16348，必须为2的N次方
    waveform: {
        maxHeight?: number, // 最大波形高度
        minHeight?: number, // 最小波形高度
        spacing?: number, // 波形间隔
        color?: string, // 波形颜色，可以传入数组以生成渐变色
        shadowBlur?: number, // 阴影模糊半径
        shadowColor?: string, // 阴影颜色
        fadeSide?: boolean, // 渐隐两端
        horizontalAlign: string, // 水平对齐方式，left/center/right
        verticalAlign?: string // 垂直对齐方式 top/middle/bottom
    }
}

class AudioVisual {
    private source: MediaElementAudioSourceNode | MediaStreamAudioSourceNode;
    private option: optionInterface;
    private callback: Function;
    private dpr: any;
    private analyser: AnalyserNode;
    private meta: {
        spr: Number
    }
    private freqByteData: Uint8Array;
    private state: number = 0;

    constructor(audioSrc: MediaStream | HTMLAudioElement, option: optionInterface, callback: Function) {
        const audioContext: AudioContext = new window.AudioContext();
        this.source = audioSrc instanceof MediaStream ?
            audioContext.createMediaStreamSource(audioSrc) :
            audioContext.createMediaElementSource(audioSrc);
        this.option = option;
        this.callback = callback;
        this.dpr = window.devicePixelRatio;
        this.analyser = audioContext.createAnalyser();
        this.meta = { spr: audioContext.sampleRate };

        this.source.connect(this.analyser);
        this.analyser.fftSize = this.option.accuracy * 2;
        this.analyser.connect(audioContext.destination);

        this.freqByteData = new Uint8Array(this.analyser.frequencyBinCount);
    }

    rebuildData(freqByteData: Uint8Array, horizontalAlign: string) {
        let __freqByteData;
        if (horizontalAlign === 'left') {
            __freqByteData = freqByteData;
        } else if (horizontalAlign === 'right') {
            __freqByteData = Array.from(freqByteData).reverse();
        } else {
            __freqByteData = [].concat(
                //@ts-ignore
                Array.from(freqByteData).reverse().splice(this.option.accuracy / 2, this.option.accuracy / 2),
                Array.from(freqByteData).splice(0, this.option.accuracy / 2)
            );
        }

        return __freqByteData;
    }

    waveform(freqByteData: Uint8Array) {
        const __freqByteData = this.rebuildData(freqByteData, this.option.waveform.horizontalAlign);
        if (this.callback) {
            this.callback(__freqByteData);
        }
    }

    animate() {
        this.analyser.getByteFrequencyData(this.freqByteData);
        this.waveform(this.freqByteData);
        if (this.state === 1) {
            requestAnimationFrame(this.animate.bind(this));
        }
    }

    play() {
        this.state = 1;
        this.animate();
    }

    pause() {
        this.state = 0;
    }
}

export default AudioVisual;