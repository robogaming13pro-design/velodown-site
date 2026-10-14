
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

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  });
}

function getYouTubeId(url) {
  const host = url.hostname.toLowerCase();
  if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
    return url.pathname.split('/').filter(Boolean)[0] || null;
  }
  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    if (url.pathname === '/watch') return url.searchParams.get('v');
    const match = url.pathname.match(/^\/(shorts|embed|live)\/([^/?]+)/);
    return match ? match[2] : null;
  }
  return null;
}

function formatDuration(iso) {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return iso;
  const h = Number(match[1] || 0);
  const m = Number(match[2] || 0);
  const s = Number(match[3] || 0);
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Use POST with a JSON body.' }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON body.' }, 400);
  }

  if (typeof body.url !== 'string' || body.url.length > 2048) {
    return json({ ok: false, error: 'Please provide a valid URL under 2048 characters.' }, 400);
  }

  let url;
  try {
    url = new URL(body.url);
  } catch {
    return json({ ok: false, error: 'Please enter a valid full URL.' }, 400);
  }

  if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.')) {
    return json({ ok: false, error: 'Only HTTP/HTTPS URLs are supported.' }, 400);
  }

  const platform =
    patterns.find(([, regex]) => regex.test(url.hostname))?.[0] || null;
  const directMedia = mediaExt.test(url.pathname);

  if (platform === 'YouTube') {
    const videoId = getYouTubeId(url);

    if (!videoId || !/^[\w-]{11}$/.test(videoId)) {
      return json({ ok: false, error: 'YouTube video ID link se nahi mil saka.' }, 400);
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return json({
        ok: false,
        error: 'YouTube API key missing hai. Netlify environment variable check karo.'
      }, 500);
    }

    try {
      const apiUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      apiUrl.searchParams.set('part', 'snippet,contentDetails');
      apiUrl.searchParams.set('id', videoId);
      apiUrl.searchParams.set('key', apiKey);

      const response = await fetch(apiUrl);
      const result = await response.json();

      if (!response.ok) {
        return json({
          ok: false,
          error: result.error?.message || 'YouTube API request fail ho gayi.'
        }, 502);
      }

      const video = result.items?.[0];
      if (!video) {
        return json({
          ok: false,
          error: 'Video nahi mili, private hai, ya API se accessible nahi hai.'
        }, 404);
      }

      const thumbnails = video.snippet.thumbnails || {};
      const thumbnail =
        thumbnails.maxres?.url ||
        thumbnails.standard?.url ||
        thumbnails.high?.url ||
        thumbnails.medium?.url ||
        thumbnails.default?.url ||
        null;

      return json({
        ok: true,
        backend: 'VeloDown API connected',
        platform: 'YouTube',
        directMedia: false,
        videoId,
        title: video.snippet.title,
        channel: video.snippet.channelTitle,
        thumbnail,
        duration: formatDuration(video.contentDetails.duration),
        availability: 'metadata_found',
        qualities: [],
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        message: 'Video ki information mil gayi. Ye API video file download nahi karti.'
      });
    } catch {
      return json({
        ok: false,
        error: 'YouTube API se rabta nahi ho saka. Dobara try karo.'
      }, 502);
    }
  }

  return json({
    ok: true,
    backend: 'VeloDown API connected',
    platform: platform || (directMedia ? 'Direct media URL' : 'Unknown platform'),
    directMedia,
    availability: 'not_checked',
    qualities: [],
    message: 'Link identify ho gaya. Is platform ki actual availability aur quality abhi check nahi hui.'
  });
};
