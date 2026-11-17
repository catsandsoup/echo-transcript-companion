export const MAX_TRANSCRIPT_BYTES = 12 * 1024 * 1024;

export function parseInventory(payload, sectionId) {
  if (payload?.status !== 'ok' || !Array.isArray(payload.data)) throw new Error('Unrecognized Echo inventory response. Open the class list and try again.');
  const recordings = new Map(), lessons = new Set(), issues = [];
  let complete = true;
  const issue = (message, incomplete = false) => { issues.push(message); if (incomplete) complete = false; };
  function visit(value) {
    if (!value || typeof value !== 'object') return 0;
    if (Array.isArray(value)) return value.reduce((n, item) => n + visit(item), 0);
    for (const [key, v] of Object.entries(value)) {
      if (/^(next|nextPage|nextCursor|continuationToken|hasMore)$/i.test(key) && v) issue('Inventory advertises more pages; completeness cannot be confirmed with this Echo version.', true);
    }
    const wrapper = value.lesson?.lesson?.id ? value.lesson : value.lesson?.id && Array.isArray(value.medias) ? value : null;
    if (wrapper) {
      const lesson = wrapper.lesson;
      if (lesson.sectionId && lesson.sectionId !== sectionId) { issue('Ignored a class belonging to a different Echo section.', true); return 1; }
      if (lessons.has(lesson.id)) return 1;
      lessons.add(lesson.id);
      const title = lesson.name || lesson.displayName || 'Untitled class';
      if (!Array.isArray(wrapper.medias)) { issue(`${title}: unrecognized media list.`, true); return 1; }
      let count = 0;
      for (const media of wrapper.medias) {
        if (media.mediaType === 'Presentation' || media.mediaType === 'SlideDeck') continue;
        if (!media.id || !['Video', 'Audio'].includes(media.mediaType)) { issue(`${title}: unsupported media type ${media.mediaType || 'unknown'}.`, true); continue; }
        count++;
        if (media.isAvailable !== true || media.isHiddenDueToCaptions || media.isProcessing || media.isFailed || media.isScheduled) {
          issue(`${title}: recording is unavailable, scheduled, processing, or restricted.`); continue;
        }
        const reference = {lessonId:String(lesson.id),title,date:lesson.timing?.start || '',interactive:!!media.isInteractiveMedia};
        if (recordings.has(media.id)) recordings.get(media.id).references.push(reference);
        else recordings.set(media.id, {mediaId:String(media.id),...reference,references:[reference]});
      }
      if (!count) issue(`${title}: no accessible recording listed.`);
      return 1;
    }
    let found = 0;
    for (const [key, child] of Object.entries(value)) if (key !== 'medias' && child && typeof child === 'object') found += visit(child);
    if (value.type && !found) issue(`Unrecognized or empty inventory entry: ${value.type}.`, true);
    return found;
  }
  visit(payload);
  return {recordings:[...recordings.values()],issues:[...new Set(issues)],lessonCount:lessons.size,complete};
}

export function safeName(value, limit = 100) {
  return String(value || '').normalize('NFC').replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, ' ').replace(/\.{2,}/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[. ]+|[. ]+$/g, '').slice(0, limit).trim() || 'Untitled';
}

// Stable suffix distinguishes different media even when labels and dates repeat.
export function shortId(value) {
  let hash = 2166136261;
  for (const char of String(value)) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8,'0');
}

export function filePath(context, recording, format) {
  if (!['txt','vtt'].includes(format)) throw new Error('Unsupported transcript format');
  const date = /^\d{4}-\d{2}-\d{2}/.exec(recording.date || '')?.[0] || 'Undated';
  return `EchoVideo Transcripts/${safeName(context.courseName,60)} [${shortId(context.sectionId)}]/${date} - ${safeName(recording.title,95)} [${shortId(recording.mediaId)}].${format}`;
}

export function transcriptPath(lessonId, mediaId, operation, format) {
  if ([lessonId,mediaId].some(id=>typeof id!=='string' || !id || id.length>1000 || id==='.' || id==='..')) throw new Error('Invalid recording identity');
  const prefix = `/api/ui/echoplayer/lessons/${encodeURIComponent(lessonId)}/medias/${encodeURIComponent(mediaId)}`;
  if (operation === 'info') return `${prefix}/download-info`;
  if (operation === 'file' && ['txt','vtt'].includes(format)) return `${prefix}/transcript-file?format=${format === 'txt' ? 'text' : 'vtt'}`;
  throw new Error('Unsupported transcript operation');
}

export function validateTranscript(text, format, contentType = '') {
  const clean = String(text).replace(/^\uFEFF/,'').trim();
  const bytes = new TextEncoder().encode(text).length;
  if (!clean || bytes > MAX_TRANSCRIPT_BYTES) throw new Error('Transcript is empty or exceeds the 12 MB safety limit.');
  let jsonBody=false;
  try {const parsed=JSON.parse(clean);jsonBody=parsed!==null && typeof parsed==='object';} catch {}
  if (/html|json/i.test(contentType) || /^(<!doctype|<html|<head|<body)/i.test(clean) || jsonBody || clean.includes('\0')) throw new Error('Echo returned a login/error page instead of a transcript.');
  if (format === 'vtt' && (!/^WEBVTT(?:[ \t\r\n]|$)/.test(clean) || !/\d{2}:\d{2}(?::\d{2})?\.\d{3}\s+-->\s+\d{2}:\d{2}/.test(clean))) throw new Error('Echo returned an invalid or empty VTT transcript.');
  if (!['txt','vtt'].includes(format)) throw new Error('Unsupported transcript format');
  return {bytes};
}

export function dataURL(text, format) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i=0; i<bytes.length; i+=8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192));
  return `data:${format === 'json' ? 'application/json' : format === 'vtt' ? 'text/vtt' : 'text/plain'};charset=utf-8;base64,${btoa(binary)}`;
}
