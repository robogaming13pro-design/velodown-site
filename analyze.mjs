const patterns = [
  ['YouTube', /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i],
  ['Facebook', /(^|\.)facebook\.com$|(^|\.)fb\.watch$/i],
  ['Instagram', /(^|\.)instagram\.com$/i],
  ['TikTok', /(^|\.)tiktok\.com$/i],
  ['X / Twitter', /(^|\.)x\.com$|(^|\.)twitter\.com$/i],
  ['Vimeo', /(^|\.)vimeo\.com$/i],
  ['Dailymotion', /(^|\.)dailymotion\.com$/i],
  ['Twitch', /(^|\.)twitch\.tv$/i],
  ['LinkedIn', /(^|\.)linkedin\.com$/i],
  ['Pinterest', /(^|\.)pinterest\.[a-z.]+$/i],
  ['Reddit', /(^|\.)reddit\.com$|(^|\.)redd\.it$/i],
  ['SoundCloud', /(^|\.)soundcloud\.com$/i],
  ['Spotify', /(^|\.)spotify\.com$/i],
  ['Bilibili', /(^|\.)bilibili\.com$/i],
  ['Rumble', /(^|\.)rumble\.com$/i]
];
const mediaExt = /\.(mp4|webm|mov|m4v|m3u8|mpd|mp3|m4a|aac|wav|ogg)$/i;

export default async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ ok: false, error: 'Use POST with a JSON body.' }, { status: 405, headers: { Allow: 'POST' } });
  }
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (typeof body.url !== 'string' || body.url.length > 2048) {
    return Response.json({ ok: false, error: 'Please provide a URL under 2048 characters.' }, { status: 400 });
  }
  let url;
  try { url = new URL(body.url); } catch {
    return Response.json({ ok: false, error: 'Please enter a valid full URL.' }, { status: 400 });
  }
  if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.')) {
    return Response.json({ ok: false, error: 'Only public http/https URLs are supported.' }, { status: 400 });
  }
  const platform = patterns.find(([, regex]) => regex.test(url.hostname))?.[0] || null;
  const directMedia = mediaExt.test(url.pathname);
  return Response.json({
    ok: true,
    backend: 'VeloDown API connected',
    platform: platform || (directMedia ? 'Direct media URL' : 'Unknown platform'),
    directMedia,
    availability: 'not_checked',
    qualities: [],
    message: 'This endpoint validates and classifies the URL only. Real availability and quality require an approved platform integration; no download is performed.'
  }, { headers: { 'Cache-Control': 'no-store' } });
};
