
import type { AudioSegment } from './types';
import type { SubtitleEntry, SubtitleFormat, AppSettings } from './types'; // Import AppSettings


// Helper to convert HH:MM:SS,mmm or HH:MM:SS.mmm to seconds
export function formatTimeToSeconds(time: string): number {
  const parts = time.split(':');
  let seconds = 0;
  if (parts.length === 3) {
    seconds += parseInt(parts[0], 10) * 3600;
    seconds += parseInt(parts[1], 10) * 60;
    const lastPart = parts[2].replace(',', '.');
    seconds += parseFloat(lastPart);
  } else if (parts.length === 2) { // Support for MM:SS.mmm
    seconds += parseInt(parts[0], 10) * 60;
    const lastPart = parts[1].replace(',', '.');
    seconds += parseFloat(lastPart);
  } else if (parts.length === 1) { // Support for SS.mmm (less common in standard formats but robust for parsing)
    const lastPart = parts[0].replace(',', '.');
    seconds += parseFloat(lastPart);
  }
  return parseFloat(seconds.toFixed(3));
}

// Helper to convert seconds to HH:MM:SS,mmm (SRT) or HH:MM:SS.mmm (VTT)
export function formatSecondsToTime(totalSeconds: number, format: SubtitleFormat | 'vtt' | 'srt'): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mmm = String(milliseconds).padStart(3, '0');

  const separator = format === 'srt' ? ',' : '.';
  // Ensure VTT format includes hours even if zero, if minutes or seconds are present.
  // SRT typically always includes hours.
  if (format === 'vtt' && hours === 0 && (minutes > 0 || seconds > 0 || milliseconds > 0)) {
     return `${hh}:${mm}:${ss}${separator}${mmm}`; // VTT usually omits 00: for times < 1 hour, but standard is HH:MM:SS.mmm
  }
  return `${hh}:${mm}:${ss}${separator}${mmm}`;
}

export function parseSrt(srtContent: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  const blocks = srtContent.trim().replace(/\r\n/g, '\n').split(/\n\s*\n/);

  blocks.forEach((block, index) => {
    const lines = block.split('\n');
    if (lines.length >= 2) { // Minimum: time + text. ID is optional for parsing.
      let timeStringLineIndex = 0;
      // Check if first line is a number (block ID)
      if (/^\d+$/.test(lines[0])) {
        timeStringLineIndex = 1;
      }
      
      if (lines.length < timeStringLineIndex + 2) return; // Not enough lines for time and text

      const timeString = lines[timeStringLineIndex];
      const text = lines.slice(timeStringLineIndex + 1).join('\n');
      
      const timeParts = timeString.split(' --> ');
      if (timeParts.length === 2) {
        const startTime = formatTimeToSeconds(timeParts[0].trim());
        const endTime = formatTimeToSeconds(timeParts[1].trim());
        // Ensure endTime is not before startTime
        if (endTime < startTime) {
           console.warn(`SRT Parse Warning: End time ${endTime} is before start time ${startTime} for block ${index + 1}. Skipping.`);
           return;
        }
        entries.push({ id: `srt-${index}-${Date.now()}`, startTime, endTime, text });
      }
    }
  });
  return entries.sort((a, b) => a.startTime - b.startTime);
}

export function parseVtt(vttContent: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  const cleanContent = vttContent
    .trim()
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/^WEBVTT[^\n]*\n?/i, '') // Remove WEBVTT header and anything on its line
    .replace(/NOTE[^\n]*\n?/gm, '') // Remove NOTE comments
    .replace(/STYLE\s*\n(?:[^\n]*\n)*?\n/gm, ''); // Remove STYLE blocks

  const blocks = cleanContent.split(/\n\s*\n/);

  blocks.forEach((block, index) => {
    const lines = block.split('\n').filter(line => line.trim() !== ''); // Remove empty lines within a block
    if (lines.length === 0) return;

    let lineOffset = 0;
    // VTT blocks can start with an optional cue identifier
    if (!lines[0].includes('-->')) {
      lineOffset = 1; // Potential cue identifier on the first line
    }
    
    if (lines.length < lineOffset + 2) return; // Not enough lines for time and text

    const timeString = lines[lineOffset];
    const text = lines.slice(lineOffset + 1).join('\n');

    const timeParts = timeString.split(' --> ');
    if (timeParts.length === 2) {
      const startTimeStr = timeParts[0].trim();
      const endTimeStr = timeParts[1].trim().split(/\s+/)[0]; // Take only the time part, ignore cue settings

      const startTime = formatTimeToSeconds(startTimeStr);
      const endTime = formatTimeToSeconds(endTimeStr);
      
      if (endTime < startTime) {
           console.warn(`VTT Parse Warning: End time ${endTime} is before start time ${startTime} for block ${index + 1}. Skipping.`);
           return;
      }
      entries.push({ id: `vtt-${index}-${Date.now()}`, startTime, endTime, text });
    }
  });
  return entries.sort((a, b) => a.startTime - b.startTime);
}

export function generateSrt(subtitles: SubtitleEntry[]): string {
  const sortedSubtitles = [...subtitles].sort((a, b) => a.startTime - b.startTime);
  return sortedSubtitles
    .map((entry, index) => {
      const startTime = formatSecondsToTime(entry.startTime, 'srt');
      const endTime = formatSecondsToTime(entry.endTime, 'srt');
      return `${index + 1}\n${startTime} --> ${endTime}\n${entry.text}\n`;
    })
    .join('\n');
}

export function generateVtt(subtitles: SubtitleEntry[]): string {
  const sortedSubtitles = [...subtitles].sort((a, b) => a.startTime - b.startTime);
  let vttString = "WEBVTT\n\n";
  vttString += sortedSubtitles
    .map((entry, index) => { // VTT cue identifiers are optional, using index+1 for simplicity
      const startTime = formatSecondsToTime(entry.startTime, 'vtt');
      const endTime = formatSecondsToTime(entry.endTime, 'vtt');
      return `${index + 1}\n${startTime} --> ${endTime}\n${entry.text}\n`;
    })
    .join('\n');
  return vttString;
}

export const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper function to convert a base64 string (from data URI) to a Blob
function base64ToBlob(base64: string, type = 'application/octet-stream'): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
}

// Helper to convert Data URI to a File object for OpenAI API
export async function dataUriToRequestFile(dataUri: string, fileName: string, fileType?: string): Promise<File> {
  const [metadata, base64Data] = dataUri.split(',');
  if (!base64Data) {
    throw new Error('Invalid Data URI: Missing base64 data part.');
  }
  const type = fileType || metadata.substring(metadata.indexOf(':') + 1, metadata.indexOf(';')) || 'application/octet-stream';
  
  const blob = base64ToBlob(base64Data, type);
  return new File([blob], fileName, { type });
}


// Helper function to encode AudioBuffer to WAV Data URI
function audioBufferToWavDataURI(buffer: AudioBuffer): Promise<string> {
  return new Promise((resolve) => {
    const numOfChan = buffer.numberOfChannels;
    const EOL = '\r\n';
    let result = '';

    function writeString(s: string) {
      for (let i = 0; i < s.length; i++) {
        result += String.fromCharCode(s.charCodeAt(i) & 0xFF);
      }
    }

    // Initialize WAV Fmt Chunk parameters
    const format = 1; // PCM
    const bitDepth = 16;
    const sampleRate = buffer.sampleRate;

    // Generate the WAV header
    const blockAlign = numOfChan * (bitDepth / 8);
    const byteRate = sampleRate * blockAlign;
    const dataSize = buffer.length * blockAlign;

    let header = 'RIFF';
    // Correctly write 32-bit little-endian for (dataSize + 36)
    header += String.fromCharCode((dataSize + 36) & 0xFF, 
                                 ((dataSize + 36) >> 8) & 0xFF, 
                                 ((dataSize + 36) >> 16) & 0xFF, 
                                 ((dataSize + 36) >> 24) & 0xFF);
    header += 'WAVE';
    header += 'fmt ';
    // Correctly write 32-bit little-endian for Fmt Chunk size (16)
    header += String.fromCharCode(16, 0, 0, 0);
    header += String.fromCharCode(format & 0xFF, (format >> 8) & 0xFF); // Format (PCM)
    header += String.fromCharCode(numOfChan & 0xFF, (numOfChan >> 8) & 0xFF); // Number of channels
    // Sample rate
    header += String.fromCharCode(sampleRate & 0xFF, (sampleRate >> 8) & 0xFF, (sampleRate >> 16) & 0xFF, (sampleRate >> 24) & 0xFF);
    // Byte rate
    header += String.fromCharCode(byteRate & 0xFF, (byteRate >> 8) & 0xFF, (byteRate >> 16) & 0xFF, (byteRate >> 24) & 0xFF);
    header += String.fromCharCode(blockAlign & 0xFF, (blockAlign >> 8) & 0xFF); // Block align
    header += String.fromCharCode(bitDepth & 0xFF, (bitDepth >> 8) & 0xFF); // Bits per sample
    header += 'data';
    // Data Chunk size
    header += String.fromCharCode(dataSize & 0xFF, (dataSize >> 8) & 0xFF, (dataSize >> 16) & 0xFF, (dataSize >> 24) & 0xFF);

    result = header;

    // Write the PCM data
    const channels = [];
    for (let i = 0; i < numOfChan; i++) {
      channels.push(buffer.getChannelData(i));
    }

    for (let i = 0; i < buffer.length; i++) {
      for (let chan = 0; chan < numOfChan; chan++) {
        let sample = Math.max(-1, Math.min(1, channels[chan][i]));
        sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF) | 0; // Convert to 16-bit signed int
        result += String.fromCharCode(sample & 0xFF, (sample >> 8) & 0xFF);
      }
    }
    
    // Convert binary string to base64
    let binaryString = '';
    for (let i = 0; i < result.length; i++) {
        binaryString += String.fromCharCode(result.charCodeAt(i) & 0xFF);
    }
    const base64Wav = btoa(binaryString);
    resolve('data:audio/wav;base64,' + base64Wav);
  });
}


export async function sliceAudioToDataURI(
  rawFile: File,
  startTime: number,
  endTime: number
): Promise<string> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const fileBuffer = await rawFile.arrayBuffer();
  let originalBuffer: AudioBuffer;
  try {
    originalBuffer = await audioContext.decodeAudioData(fileBuffer);
  } catch (e) {
    console.error("[sliceAudioToDataURI] Error decoding audio data:", e);
    console.error("Error decoding audio data:", e);
    throw new Error("Could not decode audio file.");
  }

  const startSample = Math.floor(startTime * originalBuffer.sampleRate);
  const endSample = Math.floor(endTime * originalBuffer.sampleRate);

  // Ensure slice range is valid and within buffer bounds
  const validStartSample = Math.max(0, Math.min(startSample, originalBuffer.length));
  const validEndSample = Math.max(0, Math.min(endSample, originalBuffer.length));
  console.log(`[sliceAudioToDataURI] Calculated startSample: ${startSample}, endSample: ${endSample}`);
  let adjustedStartSample = startSample;
  let adjustedEndSample = endSample;
  

  // If the slice is less than 2 seconds, extend the start time backward
  if ((endTime - startTime) < 2) {
    const twoSecondsInSamples = Math.floor(2 * originalBuffer.sampleRate);
    // Ensure the adjusted start time is not less than 0
    adjustedStartSample = Math.max(0, adjustedStartSample - twoSecondsInSamples);
    console.log(`[sliceAudioToDataURI] Adjusted startSample: ${adjustedStartSample}, adjusted endSample: ${adjustedEndSample}`);    
  }
  console.log(`[sliceAudioToDataURI] Slicing audio from sample ${adjustedStartSample} to ${adjustedEndSample} (approx ${adjustedStartSample / originalBuffer.sampleRate}s to ${adjustedEndSample / originalBuffer.sampleRate}s)`);



  const slicedBuffer = audioContext.createBuffer(
    originalBuffer.numberOfChannels,
    adjustedEndSample - adjustedStartSample, // Use valid range for buffer length
    originalBuffer.sampleRate
  );

  for (let i = 0; i < originalBuffer.numberOfChannels; i++) {
    const channelData = originalBuffer.getChannelData(i);
    const slicedChannelData = slicedBuffer.getChannelData(i);

    // Use the valid range for the subarray to avoid out of bounds errors
    const safeStart = adjustedStartSample;
    const safeEnd = adjustedEndSample;
    const subarray = channelData.subarray(safeStart, safeEnd);

    slicedChannelData.set(subarray);
  }


  // Use OfflineAudioContext to render the sliced buffer to ensure it's in a processable state
  const offlineContext = new OfflineAudioContext(
    slicedBuffer.numberOfChannels,
    slicedBuffer.length,
    slicedBuffer.sampleRate
  );
  const bufferSource = offlineContext.createBufferSource();
  bufferSource.buffer = slicedBuffer;
  bufferSource.connect(offlineContext.destination);
  bufferSource.start();
  
  const renderedBuffer = await offlineContext.startRendering();
  return audioBufferToWavDataURI(renderedBuffer);
}

// Function to split a long duration into segments
// Currently assumes a maximum segment length for transcription APIs
// This needs to be adjusted based on the specific API limits (e.g., Whisper ~25MB, or time limits)
// A common strategy is to split by time, e.g., 30 seconds, and then check size if necessary.

/**
 * Splits a total duration into smaller segments of a maximum length.
 * @param totalDuration The total duration in seconds.
 * @param maxSegmentDuration The maximum desired duration for each segment in seconds (obtained from AppSettings).
 * @returns An array of AudioSegment objects.
 */
export async function splitDurationIntoSegments(totalDuration: number, maxSegmentDuration: number): Promise<AudioSegment[]> {
  const segments: AudioSegment[] = [];
  let currentStartTime = 0;

  while (currentStartTime < totalDuration) {
    const segmentEndTime = Math.min(currentStartTime + maxSegmentDuration, totalDuration);
    const segmentDuration = segmentEndTime - currentStartTime;

    // Only add a segment if it has a non-zero duration
    if (segmentDuration > 0) {
      segments.push({
        startTime: currentStartTime,
        endTime: segmentEndTime,
        duration: segmentDuration,
      });
    }

    currentStartTime = segmentEndTime;
  }
  return segments;
}

/**
 * Merges subtitle entries based on duration criteria: if an entry is less than 2 seconds,
 * it's merged with the previous entry, combining their text and time ranges.
 * @param subtitles The array of subtitle entries to process.
 * @returns A new array of merged subtitle entries.
 */
export function mergeShortSubtitles(subtitles: SubtitleEntry[]): SubtitleEntry[] {
  if (!subtitles || subtitles.length === 0) {
    return [];
  }

  const mergedSubtitles: SubtitleEntry[] = [];
  // Process a copy to avoid mutating the original array
  const entriesToProcess = [...subtitles].sort((a, b) => a.startTime - b.startTime);

  let currentEntry = { ...entriesToProcess[0] };

  for (let i = 1; i < entriesToProcess.length; i++) {
    const nextEntry = { ...entriesToProcess[i] };
    const currentDuration = currentEntry.endTime - currentEntry.startTime;

    // Check if the current entry's duration is less than 2 seconds
    if (currentDuration < 2) {
      // Merge currentEntry with the nextEntry
      // Extend the previous entry's end time to the next entry's end time
      // Concatenate text, adding a space or newline for clarity (newline often preferred for subtitles)
      currentEntry.endTime = nextEntry.endTime;
      // Decide on the separator. A newline might be better for readability in the editor.
      // If you prefer just a space, change '\n' to ' '.
      currentEntry.text = `${currentEntry.text}\n${nextEntry.text}`;
      // Note: The ID of the merged entry will be the ID of the first entry in the merge.
      // This might need adjustment depending on how IDs are used elsewhere.

      // Continue loop, the next entry will be considered for merging with the newly extended currentEntry in the next iteration if needed.
    } else {
      // Current entry is 2 seconds or longer, so it's fine on its own. Add it to results and start a new current entry.
      mergedSubtitles.push(currentEntry);
      currentEntry = nextEntry; // The next entry becomes the start of a potential new merge group
    }
  }
  // Add the last processed entry
  mergedSubtitles.push(currentEntry);
  return mergedSubtitles;
}

