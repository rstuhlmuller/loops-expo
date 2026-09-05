import type {
    ActiveLive,
    LiveChannelPayload,
    LiveChatMode,
    LiveHeartbeat,
    LiveMessage,
    LiveSnapshot,
} from '@/types/live';
import { Storage } from '@/utils/cache';

function baseUrl() {
    const instance = Storage.getString('app.instance');

    if (!instance) {
        throw new Error('No instance configured');
    }

    return `https://${instance}`;
}

function headers() {
    const token = Storage.getString('app.token');

    return {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

async function liveRequest<T>(
    path: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: Record<string, unknown>,
): Promise<T> {
    const response = await fetch(`${baseUrl()}${path}`, {
        method,
        headers: headers(),
        ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const text = await response.text();
    let payload: any = null;

    try {
        payload = text ? JSON.parse(text) : null;
    } catch {
        payload = null;
    }

    if (!response.ok) {
        const message =
            payload?.message || payload?.error || `Request failed with ${response.status}`;

        throw new Error(message);
    }

    return payload as T;
}

export async function getLiveSnapshot(publicId: string): Promise<LiveSnapshot> {
    return liveRequest(`/api/v1/live/${publicId}`);
}

export async function sendLiveMessage(publicId: string, body: string): Promise<LiveMessage> {
    return liveRequest(`/api/v1/live/${publicId}/chat`, 'POST', { body });
}

export async function deleteLiveMessage(publicId: string, seq: number) {
    return liveRequest(`/api/v1/live/${publicId}/chat/${seq}`, 'DELETE');
}

export async function banLiveViewer(publicId: string, profileId: string) {
    return liveRequest(`/api/v1/live/${publicId}/ban`, 'POST', { profile_id: profileId });
}

export async function liveHeartbeat(
    publicId: string,
    guestToken?: string | null,
): Promise<LiveHeartbeat> {
    return liveRequest(`/api/v1/live/${publicId}/heartbeat`, 'POST', {
        guest_token: guestToken ?? undefined,
    });
}

export async function getLiveChannel(): Promise<LiveChannelPayload> {
    return liveRequest('/api/v1/live/channel');
}

export async function updateLiveChannel(payload: {
    title?: string | null;
    description?: string | null;
    chat_enabled?: boolean;
    chat_mode?: LiveChatMode;
    visibility?: number;
}): Promise<LiveChannelPayload> {
    return liveRequest('/api/v1/live/channel', 'POST', payload);
}

export async function rotateLiveKey(): Promise<LiveChannelPayload> {
    return liveRequest('/api/v1/live/channel/rotate-key', 'POST', {});
}

export async function endLiveStream() {
    return liveRequest('/api/v1/live/channel/end', 'POST', {});
}

export async function getActiveLives(): Promise<ActiveLive[]> {
    const response = await liveRequest<{ data: ActiveLive[] }>('/api/v1/live/active');

    return response?.data ?? [];
}
