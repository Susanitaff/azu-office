import https from 'node:https';
import crypto from 'node:crypto';
import { getGoogleAccessToken } from './google-oauth.js';

const API_HOST = 'www.googleapis.com';
const TZ = 'America/Argentina/Buenos_Aires';

function googleJson(method, path, token, body = null, attempts = 3) {
  const payload = body ? JSON.stringify(body) : null;

  const run = (attempt) => new Promise((resolve, reject) => {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = https.request({
      protocol: 'https:',
      hostname: API_HOST,
      port: 443,
      path,
      method,
      headers,
      timeout: 12000,
      family: 4,
    }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        let data = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }

        const status = res.statusCode || 0;
        if ([502,503,504].includes(status) && attempt < attempts) {
          setTimeout(() => run(attempt + 1).then(resolve).catch(reject), 350 * attempt);
          return;
        }

        if (status < 200 || status >= 300) {
          const message = data?.error?.message || data?.error_description || `Google Calendar respondió ${status}`;
          const error = new Error(message);
          error.status = status;
          error.details = data;
          reject(error);
          return;
        }

        resolve(data);
      });
    });

    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

  return run(1);
}

export async function listUpcomingEvents(limit = 20) {
  const token = await getGoogleAccessToken();
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    maxResults: String(limit),
    singleEvents: 'true',
    orderBy: 'startTime',
    timeZone: TZ,
  });
  const data = await googleJson(
    'GET',
    `/calendar/v3/calendars/primary/events?${params.toString()}`,
    token
  );
  return data.items || [];
}

export async function createCalendarEvent({
  summary,
  description = '',
  startAt,
  endAt = null,
  withMeet = false,
}) {
  const token = await getGoogleAccessToken();
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) throw new Error('Fecha de inicio inválida');

  const end = endAt ? new Date(endAt) : new Date(start.getTime() + 60 * 60 * 1000);
  if (Number.isNaN(end.getTime())) throw new Error('Fecha de fin inválida');

  const event = {
    summary,
    description: description || undefined,
    start: { dateTime: start.toISOString(), timeZone: TZ },
    end: { dateTime: end.toISOString(), timeZone: TZ },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 10 },
      ],
    },
  };

  let suffix = '';
  if (withMeet) {
    event.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    };
    suffix = '?conferenceDataVersion=1';
  }

  return await googleJson(
    'POST',
    `/calendar/v3/calendars/primary/events${suffix}`,
    token,
    event
  );
}
