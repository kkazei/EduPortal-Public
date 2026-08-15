const QUEUE_KEY = 'pending-grade-actions';

function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}
function setQueue(q) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }

export function enqueueGradeAction(action) {
  const q = getQueue();
  q.push({ ...action, queuedAt: Date.now() });
  setQueue(q);
}

export async function flushGradeQueue() {
  const q = getQueue();
  if (!q.length || !navigator.onLine) return;

  const remaining = [];
  for (const action of q) {
    try {
      const res = await fetch('/api/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(action),
      });
      if (!res.ok) throw new Error('Failed');
    } catch {
      remaining.push(action);
    }
  }
  setQueue(remaining);
}

// Auto-flush when back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => flushGradeQueue());
}