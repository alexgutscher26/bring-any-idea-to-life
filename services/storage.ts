
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let currentUserId: string | null = null;
let currentUserEmail: string | null = null;
let currentUserName: string | null = null;
export function setCurrentUser(userId: string | null) { currentUserId = userId; }
export function setCurrentUserInfo(user: { id: string; email?: string; name?: string } | null) {
  currentUserId = user?.id || null;
  currentUserEmail = user?.email || null;
  currentUserName = user?.name || null;
}

export async function getUserPlan(): Promise<'HOBBY' | 'PRO'> {
  if (!currentUserId) return 'HOBBY'
  const resp = await fetch('/api/user/plan', { headers: { 'x-user-id': currentUserId, 'x-user-email': currentUserEmail || '', 'x-user-name': currentUserName || '' } })
  if (!resp.ok) return 'HOBBY'
  const data = await resp.json()
  return (data.plan || 'HOBBY') as 'HOBBY' | 'PRO'
}

export async function setUserPlan(plan: 'HOBBY' | 'PRO'): Promise<void> {
  if (!currentUserId) throw new Error('Missing user')
  const resp = await fetch('/api/user/plan', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId, 'x-user-email': currentUserEmail || '', 'x-user-name': currentUserName || '' }, body: JSON.stringify({ plan }) })
  if (!resp.ok) throw new Error('Failed to set plan')
}

export async function saveCreation(creation: any): Promise<void> {
  if (!currentUserId) throw new Error('Missing user');
  const resp = await fetch('/api/creations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId, 'x-user-email': currentUserEmail || '', 'x-user-name': currentUserName || '' },
    body: JSON.stringify(creation)
  });
  if (!resp.ok) throw new Error('Failed to save');
}

export async function getAllCreations(): Promise<any[]> {
  if (!currentUserId) return [];
  const resp = await fetch('/api/creations', { headers: { 'x-user-id': currentUserId, 'x-user-email': currentUserEmail || '', 'x-user-name': currentUserName || '' } });
  if (!resp.ok) return [];
  return await resp.json();
}

export async function deleteCreation(id: string): Promise<void> {
  if (!currentUserId) throw new Error('Missing user');
  const resp = await fetch(`/api/creations/${id}`, { method: 'DELETE', headers: { 'x-user-id': currentUserId, 'x-user-email': currentUserEmail || '', 'x-user-name': currentUserName || '' } });
  if (!resp.ok) throw new Error('Failed to delete');
}

export async function getFolders(): Promise<any[]> {
  if (!currentUserId) return [];
  const resp = await fetch('/api/folders', { headers: { 'x-user-id': currentUserId, 'x-user-email': currentUserEmail || '', 'x-user-name': currentUserName || '' } });
  if (!resp.ok) return [];
  return await resp.json();
}

export async function createFolder(folder: { id: string; name: string }): Promise<any> {
  if (!currentUserId) throw new Error('Missing user');
  const resp = await fetch('/api/folders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId, 'x-user-email': currentUserEmail || '', 'x-user-name': currentUserName || '' }, body: JSON.stringify(folder) });
  if (!resp.ok) {
    let msg = 'Failed to create folder';
    try { const err = await resp.json(); if (err?.error) msg = err.error; } catch {}
    throw new Error(msg);
  }
  return await resp.json();
}

export async function renameFolder(id: string, name: string): Promise<void> {
  if (!currentUserId) throw new Error('Missing user');
  const resp = await fetch(`/api/folders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId, 'x-user-email': currentUserEmail || '', 'x-user-name': currentUserName || '' }, body: JSON.stringify({ name }) });
  if (!resp.ok) {
    let msg = 'Failed to rename folder';
    try { const err = await resp.json(); if (err?.error) msg = err.error; } catch {}
    throw new Error(msg);
  }
}
