export const MULTIPLAYER_CHANNEL_PREFIX = 'billion-rush:match:';

export function channelName(matchId: string) {
  return `${MULTIPLAYER_CHANNEL_PREFIX}${matchId}`;
}

export function remainingMs(deadlineIso: string, now = Date.now()) {
  return Math.max(0, new Date(deadlineIso).getTime() - now);
}

export function canSubmit(deadlineIso: string, now = Date.now()) {
  return remainingMs(deadlineIso, now) > 0;
}
