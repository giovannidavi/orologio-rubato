import { database } from './config';
import {
  ref,
  set,
  get,
  remove,
  onValue,
  off
} from 'firebase/database';

// Sanitize API key for use as Firebase path key
// Firebase doesn't allow: . # $ [ ] /
function sanitizeApiKey(apiKey) {
  return apiKey
    .replace(/\./g, '_dot_')
    .replace(/#/g, '_hash_')
    .replace(/\$/g, '_dollar_')
    .replace(/\[/g, '_lbracket_')
    .replace(/\]/g, '_rbracket_')
    .replace(/\//g, '_slash_');
}

const BASE_PATH = 'orologio_rubato_chats';

// Get chat history for a specific character and API key (team)
export async function getChatHistory(apiKey, characterId) {
  const sanitizedKey = sanitizeApiKey(apiKey);
  const chatRef = ref(database, `${BASE_PATH}/${sanitizedKey}/${characterId}/messages`);
  const snapshot = await get(chatRef);
  return snapshot.val() || [];
}

// Save chat history for a specific character and API key (team)
export async function saveChatHistory(apiKey, characterId, messages) {
  const sanitizedKey = sanitizeApiKey(apiKey);
  const chatRef = ref(database, `${BASE_PATH}/${sanitizedKey}/${characterId}/messages`);
  await set(chatRef, messages);
}

// Get question counts for all characters for a specific API key (team)
export async function getQuestionCounts(apiKey, characterIds) {
  const sanitizedKey = sanitizeApiKey(apiKey);
  const counts = {};

  for (const charId of characterIds) {
    const messages = await getChatHistory(apiKey, charId);
    counts[charId] = messages.filter(m => m.role === 'user').length;
  }

  return counts;
}

// Clear all chat history for a specific API key (team)
export async function clearTeamHistory(apiKey) {
  const sanitizedKey = sanitizeApiKey(apiKey);
  const teamRef = ref(database, `${BASE_PATH}/${sanitizedKey}`);
  await remove(teamRef);
}

// Subscribe to chat history changes for a specific character
export function subscribeToChatHistory(apiKey, characterId, callback, onError) {
  const sanitizedKey = sanitizeApiKey(apiKey);
  const chatRef = ref(database, `${BASE_PATH}/${sanitizedKey}/${characterId}/messages`);

  onValue(chatRef, (snapshot) => {
    callback(snapshot.val() || []);
  }, (error) => {
    console.error('Firebase subscription error:', error);
    if (onError) onError(error);
  });

  return () => off(chatRef);
}

// Subscribe to all chat history for a team (to get question counts)
export function subscribeToTeamChats(apiKey, characterIds, callback) {
  const sanitizedKey = sanitizeApiKey(apiKey);
  const teamRef = ref(database, `${BASE_PATH}/${sanitizedKey}`);

  onValue(teamRef, (snapshot) => {
    const data = snapshot.val() || {};
    const counts = {};

    characterIds.forEach(charId => {
      const messages = data[charId]?.messages || [];
      counts[charId] = messages.filter(m => m.role === 'user').length;
    });

    callback(counts);
  });

  return () => off(teamRef);
}
