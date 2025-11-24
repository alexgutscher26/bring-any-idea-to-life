
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let currentUserId: string | null = null;
let currentUserEmail: string | null = null;
let currentUserName: string | null = null;
const API_BASE = (process.env.API_BASE_URL || '').replace(/\/+$/, '');
/**
 * Constructs the API URL by appending the given path to the base URL if defined.
 */
function apiUrl(p: string) { return API_BASE ? `${API_BASE}${p}` : p }
/**
 * Sets the current user ID.
 */
export function setCurrentUser(userId: string | null) { currentUserId = userId; }
export function setCurrentUserInfo(user: { id: string; email?: string; name?: string } | null) {
  currentUserId = user?.id || null;
  currentUserEmail = user?.email || null;
  currentUserName = user?.name || null;
}

/**
 * Retrieve the user's subscription plan.
 *
 * This function checks if the current user ID is available; if not, it defaults to 'HOBBY'.
 * It then fetches the user's plan from the API using the current user's ID, email, and name in the headers.
 * If the response is not successful, it again defaults to 'HOBBY'. Finally, it returns the user's plan or defaults to 'HOBBY' if not specified.
 *
 * @returns A promise that resolves to the user's subscription plan, either 'HOBBY' or 'PRO'.
 */
export async function getUserPlan(): Promise<'HOBBY' | 'PRO'> {
  if (!currentUserId) return 'HOBBY'
  const resp = await fetch(apiUrl('/api/user/plan'), { headers: { 'x-user-id': currentUserId, 'x-user-email': currentUserEmail || '', 'x-user-name': currentUserName || '' } })
  if (!resp.ok) return 'HOBBY'
  const data = await resp.json()
  return (data.plan || 'HOBBY') as 'HOBBY' | 'PRO'
}

/**
 * Sets the user's plan to either 'HOBBY' or 'PRO'.
 *
 * This function checks if the current user ID is available and throws an error if it is missing.
 * It then sends a POST request to the API endpoint to update the user's plan, including necessary headers
 * such as user ID, email, and name. If the response is not successful, it throws an error indicating the failure.
 *
 * @param plan - The plan to set for the user, which can be either 'HOBBY' or 'PRO'.
 */
export async function setUserPlan(plan: 'HOBBY' | 'PRO'): Promise<void> {
  if (!currentUserId) throw new Error('Missing user')
  const resp = await fetch(apiUrl('/api/user/plan'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId, 'x-user-email': currentUserEmail || '', 'x-user-name': currentUserName || '' }, body: JSON.stringify({ plan }) })
  if (!resp.ok) throw new Error('Failed to set plan')
}

export async function saveCreation(creation: any): Promise<void> {
  if (!currentUserId) throw new Error('Missing user');
  const resp = await fetch(apiUrl('/api/creations'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId, 'x-user-email': currentUserEmail || '', 'x-user-name': currentUserName || '' },
    body: JSON.stringify(creation)
  });
  if (!resp.ok) throw new Error('Failed to save');
}

/**
 * Retrieves all creations for the current user.
 *
 * This function checks if a user is currently logged in by verifying the `currentUserId`.
 * If the user is not logged in, it returns an empty array. If the user is logged in,
 * it fetches the creations from the API using the user's ID, email, and name in the headers.
 * If the response is not successful, it also returns an empty array; otherwise, it returns
 * the parsed JSON response containing the creations.
 */
export async function getAllCreations(): Promise<any[]> {
  if (!currentUserId) return [];
  const resp = await fetch(apiUrl('/api/creations'), { headers: { 'x-user-id': currentUserId, 'x-user-email': currentUserEmail || '', 'x-user-name': currentUserName || '' } });
  if (!resp.ok) return [];
  return await resp.json();
}

/**
 * Deletes a creation by its ID.
 *
 * This function checks for the presence of the current user ID and throws an error if it is missing.
 * It then sends a DELETE request to the API endpoint for the specified creation ID, including user headers.
 * If the response is not successful, it throws an error indicating the failure to delete.
 *
 * @param id - The ID of the creation to be deleted.
 */
export async function deleteCreation(id: string): Promise<void> {
  if (!currentUserId) throw new Error('Missing user');
  const resp = await fetch(apiUrl(`/api/creations/${id}`), { method: 'DELETE', headers: { 'x-user-id': currentUserId, 'x-user-email': currentUserEmail || '', 'x-user-name': currentUserName || '' } });
  if (!resp.ok) throw new Error('Failed to delete');
}

/**
 * Retrieves a list of folders for the current user.
 *
 * This function checks if a current user ID is available. If not, it returns an empty array.
 * It then makes a fetch request to the API endpoint for folders, including user-specific headers.
 * If the response is not successful, it also returns an empty array. Otherwise, it parses and returns the JSON response.
 */
export async function getFolders(): Promise<any[]> {
  if (!currentUserId) return [];
  const resp = await fetch(apiUrl('/api/folders'), { headers: { 'x-user-id': currentUserId, 'x-user-email': currentUserEmail || '', 'x-user-name': currentUserName || '' } });
  if (!resp.ok) return [];
  return await resp.json();
}

/**
 * Create a new folder for the current user.
 *
 * This function checks if the current user ID is available, then sends a POST request to the API to create a folder with the provided details. If the request fails, it attempts to extract an error message from the response. Finally, it returns the created folder's details as a JSON object.
 *
 * @param folder - An object containing the folder's id and name.
 * @returns A promise that resolves to the created folder's details.
 * @throws Error If the current user ID is missing or if the folder creation fails.
 */
export async function createFolder(folder: { id: string; name: string }): Promise<any> {
  if (!currentUserId) throw new Error('Missing user');
  const resp = await fetch(apiUrl('/api/folders'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId, 'x-user-email': currentUserEmail || '', 'x-user-name': currentUserName || '' }, body: JSON.stringify(folder) });
  if (!resp.ok) {
    let msg = 'Failed to create folder';
    try { const err = await resp.json(); if (err?.error) msg = err.error; } catch {}
    throw new Error(msg);
  }
  return await resp.json();
}

/**
 * Rename a folder by its ID.
 *
 * This function checks for the presence of the current user ID and then sends a PUT request to the API to rename the folder with the specified ID. If the response is not successful, it attempts to extract an error message from the response JSON before throwing an error.
 *
 * @param id - The ID of the folder to be renamed.
 * @param name - The new name for the folder.
 * @returns A promise that resolves when the folder has been successfully renamed.
 * @throws Error If the current user ID is missing or if the API request fails.
 */
export async function renameFolder(id: string, name: string): Promise<void> {
  if (!currentUserId) throw new Error('Missing user');
  const resp = await fetch(apiUrl(`/api/folders/${id}`), { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId, 'x-user-email': currentUserEmail || '', 'x-user-name': currentUserName || '' }, body: JSON.stringify({ name }) });
  if (!resp.ok) {
    let msg = 'Failed to rename folder';
    try { const err = await resp.json(); if (err?.error) msg = err.error; } catch {}
    throw new Error(msg);
  }
}
