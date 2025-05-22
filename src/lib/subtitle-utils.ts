
import type { SubtitleEntry, SubtitleFormat } from './types';

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
