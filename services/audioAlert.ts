import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Helper to generate a simple mono 16-bit PCM WAV in Base64
function generateWavBase64(frequency: number, durationMs: number, sampleRate = 22050): string {
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const dataByteLength = numSamples * 2; // 16-bit = 2 bytes per sample
  const totalLength = 44 + dataByteLength;

  const buffer = new Uint8Array(totalLength);
  const view = new DataView(buffer.buffer);

  // RIFF chunk descriptor
  buffer[0] = 0x52; // 'R'
  buffer[1] = 0x49; // 'I'
  buffer[2] = 0x46; // 'F'
  buffer[3] = 0x46; // 'F'
  view.setUint32(4, totalLength - 8, true);
  buffer[8] = 0x57; // 'W'
  buffer[9] = 0x41; // 'A'
  buffer[10] = 0x56; // 'V'
  buffer[11] = 0x45; // 'E'

  // "fmt " sub-chunk
  buffer[12] = 0x66; // 'f'
  buffer[13] = 0x6d; // 'm'
  buffer[14] = 0x74; // 't'
  buffer[15] = 0x20; // ' '
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  // "data" sub-chunk
  buffer[36] = 0x64; // 'd'
  buffer[37] = 0x61; // 'a'
  buffer[38] = 0x74; // 't'
  buffer[39] = 0x61; // 'a'
  view.setUint32(40, dataByteLength, true);

  // Generate sine wave samples with gentle attack and decay
  const volume = 0.7;
  const attackSamples = Math.floor(sampleRate * 0.01);
  const decaySamples = Math.floor(sampleRate * 0.02);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let amp = volume;

    if (i < attackSamples) {
      amp = volume * (i / attackSamples);
    } else if (i > numSamples - decaySamples) {
      amp = volume * ((numSamples - i) / decaySamples);
    }

    const sample = Math.sin(2 * Math.PI * frequency * t) * amp * 32767;
    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.floor(sample))), true);
  }

  // Convert Uint8Array to base64
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

class AudioAlertService {
  private isAudioConfigured = false;
  private tickFilePath: string | null = null;
  private chimeFilePath: string | null = null;
  private tickPlayer: AudioPlayer | null = null;
  private chimePlayer: AudioPlayer | null = null;
  private isMuted = false;

  private async initFiles() {
    if (this.tickFilePath && this.chimeFilePath) return;
    try {
      const tickBase64 = generateWavBase64(660, 90);
      const chimeBase64 = generateWavBase64(988, 320);

      this.tickFilePath = `${FileSystem.cacheDirectory}gym_rest_tick.wav`;
      this.chimeFilePath = `${FileSystem.cacheDirectory}gym_rest_chime.wav`;

      await FileSystem.writeAsStringAsync(this.tickFilePath, tickBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await FileSystem.writeAsStringAsync(this.chimeFilePath, chimeBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (e) {
      console.warn('Could not write audio WAV files to cache:', e);
    }
  }

  private async setupAudioMode() {
    if (this.isAudioConfigured || Platform.OS === 'web') return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers', // Lowers background Spotify/music volume instead of stopping it!
      });
      this.isAudioConfigured = true;
    } catch (err) {
      console.warn('setAudioModeAsync warning:', err);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Plays short countdown tick (for 3s, 2s, 1s)
  public async playCountdownTick() {
    // Always trigger haptic
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    if (this.isMuted) return;

    try {
      await this.setupAudioMode();
      await this.initFiles();
      if (!this.tickFilePath) return;

      if (!this.tickPlayer) {
        this.tickPlayer = createAudioPlayer(this.tickFilePath);
      }
      this.tickPlayer.seekTo(0);
      this.tickPlayer.play();
    } catch (e) {
      console.warn('Could not play countdown tick:', e);
    }
  }

  // Plays triumphant completion chime (for 0s)
  public async playCompletionChime() {
    // Strong double haptic
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }, 150);
    }

    if (this.isMuted) return;

    try {
      await this.setupAudioMode();
      await this.initFiles();
      if (!this.chimeFilePath) return;

      if (!this.chimePlayer) {
        this.chimePlayer = createAudioPlayer(this.chimeFilePath);
      }
      this.chimePlayer.seekTo(0);
      this.chimePlayer.play();
    } catch (e) {
      console.warn('Could not play completion chime:', e);
    }
  }
}

export const audioAlertService = new AudioAlertService();
