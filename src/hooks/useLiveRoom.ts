import type { LiveMessage, LiveStreamSummary } from '@/types/live';
import { createEcho } from '@/utils/echo';
import { getLiveSnapshot, liveHeartbeat, sendLiveMessage } from '@/utils/live';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const MAX_MESSAGES = 200;
const HEARTBEAT_MS = 15000;

export type LiveConnection = 'idle' | 'connecting' | 'connected' | 'disconnected';

export type LiveRoomOptions = {
    publicId: string;
    server?: string | null;
    token?: string | null;
    selfProfileId?: string | null;
    enabled?: boolean;
    retryWhileMissing?: boolean;
};

export function useLiveRoom({
    publicId,
    server,
    token,
    selfProfileId,
    enabled = true,
    retryWhileMissing = false,
}: LiveRoomOptions) {
    const [stream, setStream] = useState<LiveStreamSummary | null>(null);
    const [messages, setMessages] = useState<LiveMessage[]>([]);
    const [viewers, setViewers] = useState(0);
    const [connection, setConnection] = useState<LiveConnection>('idle');
    const [ended, setEnded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const seen = useRef<Set<number>>(new Set());
    const guestToken = useRef<string | null>(null);
    const pendingSeq = useRef(-1);
    const clientRef = useRef<ReturnType<typeof createEcho> | null>(null);

    const isGuest = !token;
    const realtime = stream?.realtime ?? null;

    const merge = useCallback((incoming: LiveMessage) => {
        if (seen.current.has(incoming.seq)) {
            return;
        }
        seen.current.add(incoming.seq);

        setMessages((prev) => {
            const withoutPending = prev.filter(
                (m) =>
                    !(
                        m.pending &&
                        m.body === incoming.body &&
                        m.profile?.id === incoming.profile?.id
                    ),
            );
            return [incoming, ...withoutPending].slice(0, MAX_MESSAGES);
        });
    }, []);

    const loadSnapshot = useCallback(async () => {
        if (!enabled || !publicId) {
            return false;
        }

        try {
            const snapshot = await getLiveSnapshot(publicId);
            setStream(snapshot.stream);
            setViewers(snapshot.viewers);
            setEnded(snapshot.stream.status !== 'live');

            seen.current = new Set(snapshot.messages.map((m) => m.seq));
            setMessages([...snapshot.messages].reverse().slice(0, MAX_MESSAGES));
            setError(null);

            return true;
        } catch (e: any) {
            if (!retryWhileMissing) {
                setError(e?.message ?? 'Could not load this stream.');
            }

            return false;
        }
    }, [enabled, publicId, retryWhileMissing]);

    useEffect(() => {
        if (!enabled || !publicId) {
            return;
        }

        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const attempt = async () => {
            const ok = await loadSnapshot();

            if (!ok && retryWhileMissing && !cancelled) {
                timer = setTimeout(attempt, 2000);
            }
        };

        attempt();

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [enabled, loadSnapshot, publicId, retryWhileMissing]);

    const subscribe = useCallback(() => {
        if (!enabled || !server || !realtime?.ws_host || !realtime?.app_key) {
            return;
        }

        setConnection('connecting');

        const client = createEcho({
            host: realtime.ws_host,
            port: realtime.ws_port,
            appKey: realtime.app_key,
            authEndpoint: `https://${server}/api/broadcasting/auth`,
            token,
        });
        clientRef.current = client;

        const channelName = isGuest ? `live.${publicId}.guest` : `live.${publicId}`;
        const channel = isGuest ? client.echo.channel(channelName) : client.echo.join(channelName);

        channel
            .listen('.chat.message', (payload: LiveMessage) => merge(payload))
            .listen('.chat.deleted', (payload: { seq: number }) => {
                setMessages((prev) => prev.filter((m) => m.seq !== payload.seq));
            })
            .listen('.viewers.count', (payload: { count: number }) => setViewers(payload.count))
            .listen('.stream.state', (payload: { status: string }) => {
                if (payload.status !== 'live') {
                    setEnded(true);
                }
            });

        const connector: any = client.echo.connector;
        const pusher = connector?.pusher;

        pusher?.connection?.bind('connected', () => setConnection('connected'));
        pusher?.connection?.bind('disconnected', () => setConnection('disconnected'));
        pusher?.connection?.bind('unavailable', () => setConnection('disconnected'));

        return () => {
            try {
                if (isGuest) {
                    client.echo.leaveChannel(channelName);
                } else {
                    client.echo.leave(channelName);
                }
            } catch {}
        };
    }, [enabled, isGuest, merge, publicId, realtime, server, token]);

    useEffect(() => {
        const cleanup = subscribe();

        return () => {
            cleanup?.();
            clientRef.current?.disconnect();
            clientRef.current = null;
            setConnection('idle');
        };
    }, [subscribe]);

    useEffect(() => {
        const onChange = (state: AppStateStatus) => {
            if (state === 'active') {
                loadSnapshot();
            } else {
                clientRef.current?.disconnect();
                clientRef.current = null;
                setConnection('disconnected');
            }
        };

        const sub = AppState.addEventListener('change', onChange);

        return () => sub.remove();
    }, [loadSnapshot]);

    useEffect(() => {
        if (ended || !enabled || !publicId) {
            return;
        }

        let cancelled = false;

        const beat = async () => {
            try {
                const result = await liveHeartbeat(publicId, guestToken.current);
                if (cancelled) return;
                guestToken.current = result?.token ?? guestToken.current;
                if (typeof result?.viewers === 'number') {
                    setViewers(result.viewers);
                }
                if (result?.status && result.status !== 'live') {
                    setEnded(true);
                }
            } catch {}
        };

        beat();
        const timer = setInterval(beat, HEARTBEAT_MS);

        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [enabled, ended, publicId]);

    const send = useCallback(
        async (body: string) => {
            const trimmed = body.trim();
            if (!trimmed || isGuest) {
                return;
            }

            const optimistic: LiveMessage = {
                seq: pendingSeq.current--,
                type: 'message',
                body: trimmed,
                created_at: new Date().toISOString(),
                profile: selfProfileId ? ({ id: selfProfileId } as any) : null,
                pending: true,
            };

            setMessages((prev) => [optimistic, ...prev].slice(0, MAX_MESSAGES));

            try {
                const saved = await sendLiveMessage(publicId, trimmed);
                setMessages((prev) => prev.filter((m) => m.seq !== optimistic.seq));
                merge(saved);
            } catch {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.seq === optimistic.seq ? { ...m, pending: false, failed: true } : m,
                    ),
                );
            }
        },
        [isGuest, merge, publicId, selfProfileId],
    );

    const canChat = useMemo(() => {
        return !isGuest && !ended && !!stream?.chat_enabled;
    }, [ended, isGuest, stream?.chat_enabled]);

    return {
        stream,
        messages,
        viewers,
        connection,
        ended,
        error,
        isGuest,
        canChat,
        send,
        reload: loadSnapshot,
    };
}
