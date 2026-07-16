import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { createWriteStream } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { writeFile, unlink, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

const execFileAsync = promisify(execFile);

/**
 * Service for FFmpeg-based video pre-processing before Whisper transcription.
 *
 * Responsibilities:
 * - Stream remote videos to disk (avoid loading full files into Node heap).
 * - Extract audio track from WebM/MP4 video as 16 kHz mono WAV (Whisper optimal format).
 * - Validate video duration against the question's `durationSec` limit.
 * - Strip video metadata (EXIF, GPS) for GDPR compliance before upload.
 *
 * All processing happens in `/tmp` and temp files are deleted immediately after use.
 * FFmpeg must be available on PATH (included in the Docker image).
 */
@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);

  /**
   * Stream a remote video URL directly to a temp file without buffering the body in RAM.
   *
   * @param url  Public or signed URL of the uploaded interview video.
   * @returns    Path to the written temp file (caller must delete).
   */
  async downloadToTempFile(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }
    if (!response.body) {
      throw new Error('Failed to fetch video: empty response body');
    }

    const ext = this.guessExtFromUrl(url);
    const outputPath = join(tmpdir(), `beleqet-dl-${randomUUID()}.${ext}`);
    const nodeStream = Readable.fromWeb(response.body as import('stream/web').ReadableStream);
    await pipeline(nodeStream, createWriteStream(outputPath));
    this.logger.log(`Streamed video to disk: ${outputPath}`);
    return outputPath;
  }

  /**
   * Extract audio from a video file on disk and return a 16 kHz mono WAV buffer.
   * Only the (much smaller) WAV is loaded into memory — not the source video.
   *
   * @param inputPath  Path to the source video on disk.
   * @returns          WAV audio buffer ready for the Whisper API.
   */
  async extractAudioFromFile(inputPath: string): Promise<Buffer> {
    const outputPath = join(tmpdir(), `beleqet-${randomUUID()}.wav`);

    try {
      await execFileAsync('ffmpeg', [
        '-i', inputPath,
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        '-y',
        outputPath,
      ]);

      const audioBuffer = await readFile(outputPath);
      this.logger.log(`Audio extracted: ${audioBuffer.length} bytes from ${inputPath}`);
      return audioBuffer;
    } finally {
      await unlink(outputPath).catch(() => {});
    }
  }

  /**
   * Strip all metadata from a video file on disk (EXIF, GPS, encoder tags).
   * Writes a cleaned copy next to the input; caller must delete both.
   *
   * @param inputPath  Original video path.
   * @returns          Path to the sanitised video file.
   */
  async stripMetadataFromFile(inputPath: string): Promise<string> {
    const outputPath = join(tmpdir(), `beleqet-clean-${randomUUID()}.webm`);
    await execFileAsync('ffmpeg', [
      '-i', inputPath,
      '-map_metadata', '-1',
      '-c', 'copy',
      '-y',
      outputPath,
    ]);
    return outputPath;
  }

  /**
   * Get the duration of a video file in seconds using ffprobe.
   *
   * @param inputPath  Path to video on disk.
   * @returns          Duration in seconds (float).
   */
  async getDurationSecondsFromFile(inputPath: string): Promise<number> {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      inputPath,
    ]);
    return parseFloat(stdout.trim()) || 0;
  }

  /**
   * @deprecated Prefer file-path APIs to avoid buffering large videos in RAM.
   * Kept for unit-test compatibility with small fixtures.
   */
  async extractAudio(videoBuffer: Buffer, mimeType = 'video/webm'): Promise<Buffer> {
    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mov') ? 'mov' : 'webm';
    const inputPath = join(tmpdir(), `beleqet-${randomUUID()}.${ext}`);
    try {
      await writeFile(inputPath, videoBuffer);
      return await this.extractAudioFromFile(inputPath);
    } finally {
      await unlink(inputPath).catch(() => {});
    }
  }

  /**
   * @deprecated Prefer {@link getDurationSecondsFromFile}.
   */
  async getDurationSeconds(videoBuffer: Buffer): Promise<number> {
    const inputPath = join(tmpdir(), `beleqet-probe-${randomUUID()}.webm`);
    try {
      await writeFile(inputPath, videoBuffer);
      return await this.getDurationSecondsFromFile(inputPath);
    } finally {
      await unlink(inputPath).catch(() => {});
    }
  }

  /**
   * @deprecated Prefer {@link stripMetadataFromFile}.
   */
  async stripMetadata(videoBuffer: Buffer): Promise<Buffer> {
    const inputPath = join(tmpdir(), `beleqet-in-${randomUUID()}.webm`);
    let outputPath = '';
    try {
      await writeFile(inputPath, videoBuffer);
      outputPath = await this.stripMetadataFromFile(inputPath);
      return await readFile(outputPath);
    } finally {
      await Promise.allSettled([
        unlink(inputPath).catch(() => {}),
        outputPath ? unlink(outputPath).catch(() => {}) : Promise.resolve(),
      ]);
    }
  }

  private guessExtFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname.toLowerCase();
      if (pathname.endsWith('.mp4')) return 'mp4';
      if (pathname.endsWith('.mov')) return 'mov';
      if (pathname.endsWith('.webm')) return 'webm';
    } catch {
      // fall through
    }
    return 'webm';
  }
}
