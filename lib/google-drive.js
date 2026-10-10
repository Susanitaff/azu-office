import { getGoogleAccessToken } from './google-oauth.js';

function escapeDriveQuery(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export async function searchDrive(query, limit = 10) {
  const token = await getGoogleAccessToken();
  const q = [
    'trashed = false',
    `name contains '${escapeDriveQuery(query)}'`,
  ].join(' and ');

  const params = new URLSearchParams({
    q,
    pageSize: String(limit),
    orderBy: 'modifiedTime desc',
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink,parents,iconLink)',
  });

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Google Drive rechazó la búsqueda');
  }

  return data.files || [];
}
