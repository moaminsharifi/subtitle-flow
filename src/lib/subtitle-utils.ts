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
  } else if (parts.length === 2) {
    seconds += parseInt(parts[0], 10) * 60;
    const lastPart = parts[1].replace(',', '.');
    seconds += parseFloat(lastPart);
  }
  return parseFloat(seconds.toFixed(3));
}

// Helper to convert seconds to HH:MM:SS,mmm (SRT) or HH:MM:SS.mmm (VTT)
export function formatSecondsToTime(totalSeconds: number, format: SubtitleFormat): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mmm = String(milliseconds).padStart(3, '0');

  const separator = format === 'srt' ? ',' : '.';
  return `${hh}:${mm}:${ss}${separator}${mmm}`;
}

export function parseSrt(srtContent: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);

  blocks.forEach((block, index) => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      // const id = lines[0]; // SRT block ID, we'll generate our own
      const timeString = lines[1];
      const text = lines.slice(2).join('\n');
      
      const timeParts = timeString.split(' --> ');
      if (timeParts.length === 2) {
        const startTime = formatTimeToSeconds(timeParts[0]);
        const endTime = formatTimeToSeconds(timeParts[1]);
        entries.push({ id: `srt-${index}-${Date.now()}`, startTime, endTime, text });
      }
    }
  });
  return entries;
}

export function parseVtt(vttContent: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  // Remove WEBVTT header and any comments or style blocks for simplicity
  const cleanContent = vttContent
    .replace(/^WEBVTT\s*\n?/, '')
    .replace(/NOTE\s.*\n?/gm, '')
    .replace(/STYLE\s*\n(?:.*\n)*?\n/gm, '');

  const blocks = cleanContent.trim().split(/\n\s*\n/);

  blocks.forEach((block, index) => {
    const lines = block.split('\n');
    // VTT blocks can start with an optional cue identifier
    let lineOffset = 0;
    if (lines.length > 0 && !lines[0].includes('-->')) {
      lineOffset = 1; // Potential cue identifier on the first line
    }

    if (lines.length >= lineOffset + 2) {
      const timeString = lines[lineOffset];
      const text = lines.slice(lineOffset + 1).join('\n');

      const timeParts = timeString.split(' --> ');
      if (timeParts.length === 2) {
        // VTT time can have other parameters after '-->', e.g., position. Remove them.
        const startTimeStr = timeParts[0].trim();
        const endTimeStr = timeParts[1].trim().split(' ')[0]; // Take only the time part

        const startTime = formatTimeToSeconds(startTimeStr);
        const endTime = formatTimeToSeconds(endTimeStr);
        entries.push({ id: `vtt-${index}-${Date.now()}`, startTime, endTime, text });
      }
    }
  });
  return entries;
}

export function generateSrt(subtitles: SubtitleEntry[]): string {
  return subtitles
    .map((entry, index) => {
      const startTime = formatSecondsToTime(entry.startTime, 'srt');
      const endTime = formatSecondsToTime(entry.endTime, 'srt');
      return `${index + 1}\n${startTime} --> ${endTime}\n${entry.text}\n`;
    })
    .join('\n');
}

export function generateVtt(subtitles: SubtitleEntry[]): string {
  let vttString = "WEBVTT\n\n";
  vttString += subtitles
    .map((entry, index) => {
      const startTime = formatSecondsToTime(entry.startTime, 'vtt');
      const endTime = formatSecondsToTime(entry.endTime, 'vtt');
      // VTT cue identifier is optional, can use index or entry.id
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
