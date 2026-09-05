export type LiveProfile = {
    id: string;
    username: string;
    name: string | null;
    avatar: string | null;
};

export type LiveMessage = {
    seq: number;
    type: 'message' | 'system';
    body: string;
    created_at: string;
    profile: LiveProfile | null;
    pending?: boolean;
    failed?: boolean;
};

export type LiveStreamStatus = 'preparing' | 'live' | 'ended' | 'failed';

export type LiveChatMode = 'everyone' | 'followers' | 'mutuals';

export type LiveRealtimeConfig = {
    ws_host: string | null;
    ws_port: number;
    scheme: 'https' | 'http';
    app_key: string | null;
};

export type LiveStreamSummary = {
    id: string;
    public_id: string;
    status: LiveStreamStatus;
    title: string | null;
    started_at: string | null;
    chat_enabled: boolean;
    chat_mode: LiveChatMode;
    playback_url: string;
    host: LiveProfile | null;
    realtime: LiveRealtimeConfig;
};

export type LiveSnapshot = {
    stream: LiveStreamSummary;
    messages: LiveMessage[];
    viewers: number;
};

export type LiveHeartbeat = {
    token: string;
    viewers: number;
    status: LiveStreamStatus;
};

export type LiveIngest = {
    url: string;
    key: string;
};

export type LiveChannel = {
    public_id: string;
    title: string | null;
    description: string | null;
    visibility: number;
    chat_enabled: boolean;
    chat_mode: LiveChatMode;
    is_enabled: boolean;
    can_go_live: boolean;
};

export type LiveChannelPayload = {
    channel: LiveChannel;
    ingest: LiveIngest;
    realtime: LiveRealtimeConfig;
    playback_url: string;
    current_stream: {
        id: string;
        status: LiveStreamStatus;
        started_at: string | null;
    } | null;
};

export type LiveRailAccount = {
    id: string;
    username: string;
    name: string | null;
    avatar: string | null;
};

export type ActiveLive = {
    stream_id: string;
    public_id: string;
    title: string | null;
    started_at: string | null;
    viewers: number;
    is_following: boolean;
    account: LiveRailAccount;
};
