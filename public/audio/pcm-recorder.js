// AudioWorklet processor for the Beauty Assistant microphone (docs/voice.md §4).
// Copies the first input channel to the page while recording is on. The page
// stops the microphone tracks when recording ends; nothing runs afterwards.
class PcmRecorder extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) this.port.postMessage(channel.slice(0));
    return true;
  }
}
registerProcessor("pcm-recorder", PcmRecorder);
