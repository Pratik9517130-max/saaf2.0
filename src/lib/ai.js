// src/lib/ai.js  (owner: R4)  Contract: analyzeReport({ description, files, area })
// -> { issue_type, priority, reason, source: 'ai' | 'cache' }
import { supabase } from './supabase';
import { CACHED, DEFAULT_CACHED } from '../mock/cachedAi';

// Shrinks a phone photo to ~800px so the request is small and fast.
export function fileToResizedBase64(file, maxSide = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
    };
    img.onerror = () => reject(new Error('image load failed'));
    img.src = url;
  });
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

export async function analyzeReport({ description = '', files = [], area = '' }) {
  try {
    const image_base64 = files[0] ? await fileToResizedBase64(files[0]) : null;
    const call = supabase.functions.invoke('analyze-report', {
      body: { description, area, image_base64, mime_type: 'image/jpeg' },
    });
    const { data, error } = await withTimeout(call, 8000);
    if (error || !data || data.error) throw error || new Error(data?.error || 'bad response');
    return { ...data, source: 'ai' };
  } catch (e) {
    console.warn('AI call failed, using cached answer:', e);
    // demo photos are named bin1.jpg, dump1.jpg, road1.jpg ... see cachedAi.js
    const name = (files[0]?.name || '').toLowerCase();
    const hit = Object.entries(CACHED).find(([key]) => name.includes(key));
    return { ...(hit ? hit[1] : DEFAULT_CACHED), source: 'cache' };
  }
}