import { LiveChatOverlay } from '@/components/live/LiveChatOverlay'
import { LiveViewerPill } from '@/components/live/LiveViewerPill'
import { useLiveRoom } from '@/hooks/useLiveRoom'
import type { LiveChannelPayload, LiveChatMode, LiveMessage } from '@/types/live'
import { useAuthStore } from '@/utils/authStore'
import { Storage } from '@/utils/cache'
import {
    banLiveViewer,
    deleteLiveMessage,
    endLiveStream,
    getLiveChannel,
    updateLiveChannel,
} from '@/utils/live'
import { ApiVideoLiveStreamView } from '@api.video/react-native-livestream'
import { Ionicons } from '@expo/vector-icons'
import { Stack, useFocusEffect, useIsFocused, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    AppState,
    AppStateStatus,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Camera } from 'react-native-vision-camera'
import tw from 'twrnc'

const CONNECT_TIMEOUT_MS = 15000

const CHAT_MODES: { value: LiveChatMode; label: string }[] = [
    { value: 'everyone', label: 'Everyone' },
    { value: 'followers', label: 'Followers' },
    { value: 'mutuals', label: 'Mutuals' },
]

type Phase = 'setup' | 'connecting' | 'live' | 'ending'

export default function GoLiveScreen() {
    const router = useRouter()
    const { user, server } = useAuthStore()
    const token = Storage.getString('app.token')
    const streamRef = useRef<any>(null)
    const connectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const [channel, setChannel] = useState<LiveChannelPayload | null>(null)
    const [loadFailed, setLoadFailed] = useState(false)
    const [permission, setPermission] = useState<'pending' | 'granted' | 'denied'>('pending')
    const [phase, setPhase] = useState<Phase>('setup')
    const [title, setTitle] = useState('')
    const [chatMode, setChatMode] = useState<LiveChatMode>('everyone')
    const [camera, setCamera] = useState<'front' | 'back'>('back')
    const [muted, setMuted] = useState(false)
    const [elapsed, setElapsed] = useState(0)
    const [notice, setNotice] = useState<string | null>(null)
    const [appActive, setAppActive] = useState(true)

    const isFocused = useIsFocused()

    const publicId = channel?.channel.public_id ?? ''

    const room = useLiveRoom({
        publicId,
        server,
        token,
        selfProfileId: user?.id ?? null,
        enabled: phase === 'live' && !!publicId,
        retryWhileMissing: true,
    })

    const clearConnectTimer = useCallback(() => {
        if (connectTimer.current) {
            clearTimeout(connectTimer.current)
            connectTimer.current = null
        }
    }, [])

    useEffect(() => clearConnectTimer, [clearConnectTimer])

    useEffect(() => {
        if (!isFocused || permission !== 'pending') {
            return
        }

        ; (async () => {
            const cam = await Camera.requestCameraPermission()
            const mic = await Camera.requestMicrophonePermission()
            setPermission(cam === 'granted' && mic === 'granted' ? 'granted' : 'denied')
        })()
    }, [isFocused, permission])

    useEffect(() => {
        ; (async () => {
            try {
                const payload = await getLiveChannel()
                setChannel(payload)
                setTitle(payload.channel.title ?? '')
                setChatMode(payload.channel.chat_mode)
                setLoadFailed(false)

                if (payload.current_stream?.status === 'live') {
                    setPhase('live')
                }
            } catch (e: any) {
                setLoadFailed(true)
                setNotice(e?.message ?? 'Could not load your live channel.')
            }
        })()
    }, [])

    useEffect(() => {
        if (phase !== 'live') {
            setElapsed(0)
            return
        }

        const startedAt = room.stream?.started_at
            ? new Date(room.stream.started_at).getTime()
            : Date.now()

        const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))

        tick()
        const timer = setInterval(tick, 1000)

        return () => clearInterval(timer)
    }, [phase, room.stream?.started_at])

    useEffect(() => {
        if (phase === 'live' && room.ended) {
            setPhase('setup')
            setNotice('Your stream ended.')
        }
    }, [phase, room.ended])

    useEffect(() => {
        const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
            setAppActive(state === 'active')
        })

        return () => sub.remove()
    }, [])

    const elapsedLabel = useMemo(() => {
        const h = Math.floor(elapsed / 3600)
        const m = Math.floor((elapsed % 3600) / 60)
        const s = elapsed % 60
        const pad = (n: number) => String(n).padStart(2, '0')

        return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
    }, [elapsed])

    const goLive = useCallback(async () => {
        if (!channel || !streamRef.current) {
            return
        }

        setNotice(null)

        try {
            const updated = await updateLiveChannel({
                title: title.trim() || null,
                chat_mode: chatMode,
            })
            setChannel(updated)
        } catch {
            setNotice('Could not save your stream settings.')
            return
        }

        setPhase('connecting')

        clearConnectTimer()
        connectTimer.current = setTimeout(() => {
            connectTimer.current = null
            setPhase('setup')
            setNotice('Could not reach the streaming server.')
        }, CONNECT_TIMEOUT_MS)

        try {
            await streamRef.current.startStreaming(channel.ingest.key, channel.ingest.url)
        } catch (e: any) {
            clearConnectTimer()
            setPhase('setup')
            setNotice(e?.message ? String(e.message) : 'Could not start the broadcast.')
        }
    }, [chatMode, channel, clearConnectTimer, title])

    const confirmEnd = useCallback(() => {
        Alert.alert('End broadcast?', 'Your viewers will be disconnected.', [
            { text: 'Keep streaming', style: 'cancel' },
            {
                text: 'End',
                style: 'destructive',
                onPress: async () => {
                    setPhase('ending')
                    clearConnectTimer()

                    try {
                        await streamRef.current?.stopStreaming()
                    } catch { }

                    try {
                        await endLiveStream()
                    } catch { }

                    setPhase('setup')
                    router.back()
                },
            },
        ])
    }, [clearConnectTimer, router])

    const teardown = useCallback(async () => {
        clearConnectTimer()

        try {
            await streamRef.current?.stopStreaming()
        } catch { }

        if (phase === 'live') {
            try {
                await endLiveStream()
            } catch { }
        }

        setPhase('setup')
    }, [clearConnectTimer, phase])

    const teardownRef = useRef(teardown)
    teardownRef.current = teardown

    useFocusEffect(
        useCallback(() => {
            return () => {
                teardownRef.current()
            }
        }, [])
    )

    const onModerate = useCallback(
        (message: LiveMessage) => {
            if (!message.profile || message.seq < 0) {
                return
            }

            Alert.alert(message.profile.username, undefined, [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete message',
                    onPress: () => deleteLiveMessage(publicId, message.seq).catch(() => { }),
                },
                {
                    text: 'Ban from chat',
                    style: 'destructive',
                    onPress: () => banLiveViewer(publicId, message.profile!.id).catch(() => { }),
                },
            ])
        },
        [publicId]
    )

    if (permission === 'denied') {
        return (
            <SafeAreaView style={tw`flex-1 bg-black items-center justify-center px-8`}>
                <Ionicons name="videocam-off-outline" size={40} color="#71717a" />
                <Text style={tw`text-white text-base font-semibold mt-4 text-center`}>
                    Camera and microphone access are off
                </Text>
                <Text style={tw`text-zinc-400 text-sm mt-2 text-center`}>
                    Turn them on in settings to go live.
                </Text>
                <Pressable onPress={() => router.back()} style={tw`mt-6 px-5 py-3 rounded-full bg-zinc-800`}>
                    <Text style={tw`text-white font-semibold`}>Go back</Text>
                </Pressable>
            </SafeAreaView>
        )
    }

    if (loadFailed) {
        return (
            <SafeAreaView style={tw`flex-1 bg-black items-center justify-center px-8`}>
                <Ionicons name="cloud-offline-outline" size={40} color="#71717a" />
                <Text style={tw`text-white text-base font-semibold mt-4 text-center`}>
                    Could not load your live channel
                </Text>
                {notice ? (
                    <Text style={tw`text-zinc-400 text-xs mt-2 text-center`}>{notice}</Text>
                ) : null}
                <Pressable onPress={() => router.back()} style={tw`mt-6 px-5 py-3 rounded-full bg-zinc-800`}>
                    <Text style={tw`text-white font-semibold`}>Go back</Text>
                </Pressable>
            </SafeAreaView>
        )
    }

    if (permission === 'pending') {
        return (
            <View style={tw`flex-1 bg-black items-center justify-center`}>
                <ActivityIndicator color="#F02C56" />
            </View>
        )
    }

    if (channel && !channel.channel.can_go_live) {
        return (
            <SafeAreaView style={tw`flex-1 bg-black items-center justify-center px-8`}>
                <Ionicons name="lock-closed-outline" size={40} color="#71717a" />
                <Text style={tw`text-white text-base font-semibold mt-4 text-center`}>
                    Live streaming is not available on your account yet
                </Text>
                <Pressable onPress={() => router.back()} style={tw`mt-6 px-5 py-3 rounded-full bg-zinc-800`}>
                    <Text style={tw`text-white font-semibold`}>Go back</Text>
                </Pressable>
            </SafeAreaView>
        )
    }

    const isLive = phase === 'live'
    const cameraActive = permission === 'granted' && isFocused && appActive

    return (
        <View style={tw`flex-1 bg-black`}>
            <Stack.Screen options={{ headerShown: false }} />

            {cameraActive ? (
                <ApiVideoLiveStreamView
                    ref={streamRef}
                    style={tw`absolute inset-0`}
                    camera={camera}
                    enablePinchedZoom
                    isMuted={muted}
                    video={{ fps: 30, resolution: '720p', bitrate: 2500 * 1024, gopDuration: 1 }}
                    audio={{ bitrate: 128000, sampleRate: 44100, isStereo: true }}
                    onConnectionSuccess={() => {
                        console.log('[live] onConnectionSuccess')
                        clearConnectTimer()
                        setPhase('live')
                    }}
                    onConnectionFailed={(reason: unknown) => {
                        console.log('[live] onConnectionFailed', reason)
                        clearConnectTimer()
                        setPhase('setup')
                        setNotice('The streaming server rejected the connection.')
                    }}
                    onDisconnect={() => {
                        console.log('[live] onDisconnect')
                        clearConnectTimer()
                        if (phase !== 'ending') {
                            setPhase('setup')
                            setNotice('The broadcast disconnected.')
                        }
                    }}
                />
            ) : (
                <View style={tw`absolute inset-0 bg-black`} />
            )}

            <SafeAreaView style={tw`flex-1`} edges={['top', 'bottom']}>
                <View style={tw`flex-row items-center justify-between px-4 pt-2`}>
                    {isLive ? (
                        <View style={tw`flex-row items-center`}>
                            <LiveViewerPill count={room.viewers} live />
                            <Text style={tw`text-white text-xs font-semibold ml-2`}>{elapsedLabel}</Text>
                        </View>
                    ) : (
                        <View />
                    )}

                    <Pressable
                        onPress={isLive ? confirmEnd : () => router.back()}
                        style={tw`w-9 h-9 rounded-full bg-black/50 items-center justify-center`}
                    >
                        <Ionicons name="close" size={20} color="#fff" />
                    </Pressable>
                </View>

                {!channel && !loadFailed ? (
                    <View style={tw`mx-4 mt-3 bg-black/75 rounded-xl px-3 py-2 flex-row items-center`}>
                        <ActivityIndicator color="#F02C56" size="small" />
                        <Text style={tw`text-zinc-300 text-xs ml-2`}>Loading your channel</Text>
                    </View>
                ) : null}

                {notice ? (
                    <View style={tw`mx-4 mt-3 bg-black/75 rounded-xl px-3 py-2`}>
                        <Text style={tw`text-amber-300 text-xs`}>{notice}</Text>
                    </View>
                ) : null}

                <KeyboardAvoidingView
                    style={tw`flex-1 justify-end`}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    {isLive ? (
                        <LiveChatOverlay
                            messages={room.messages}
                            canChat={room.canChat}
                            isGuest={false}
                            chatEnabled={!!room.stream?.chat_enabled}
                            onSend={room.send}
                            onLongPressMessage={onModerate}
                        />
                    ) : (
                        <ScrollView
                            style={tw`max-h-96`}
                            contentContainerStyle={tw`px-4 pb-4`}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={tw`bg-black/75 rounded-2xl p-4`}>
                                <Text style={tw`text-zinc-400 text-xs mb-1`}>Title</Text>
                                <TextInput
                                    value={title}
                                    onChangeText={setTitle}
                                    placeholder="What are you doing?"
                                    placeholderTextColor="#52525b"
                                    maxLength={120}
                                    style={tw`bg-zinc-900 text-white text-sm rounded-xl px-3 py-2.5`}
                                />

                                <Text style={tw`text-zinc-400 text-xs mt-4 mb-2`}>Who can chat</Text>
                                <View style={tw`flex-row gap-2`}>
                                    {CHAT_MODES.map((mode) => {
                                        const active = mode.value === chatMode
                                        return (
                                            <Pressable
                                                key={mode.value}
                                                onPress={() => setChatMode(mode.value)}
                                                style={tw.style(
                                                    'px-3 py-1.5 rounded-full border',
                                                    active ? 'border-[#F02C56] bg-[#F02C56]/15' : 'border-zinc-700'
                                                )}
                                            >
                                                <Text
                                                    style={tw.style(
                                                        'text-xs font-semibold',
                                                        active ? 'text-white' : 'text-zinc-400'
                                                    )}
                                                >
                                                    {mode.label}
                                                </Text>
                                            </Pressable>
                                        )
                                    })}
                                </View>
                            </View>
                        </ScrollView>
                    )}

                    <View style={tw`flex-row items-center justify-between px-8 pb-4 pt-2`}>
                        <Pressable
                            onPress={() => setCamera((c) => (c === 'back' ? 'front' : 'back'))}
                            style={tw`w-12 h-12 rounded-full bg-black/60 items-center justify-center`}
                        >
                            <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
                        </Pressable>

                        <Pressable
                            disabled={!channel || phase === 'connecting' || phase === 'ending'}
                            onPress={isLive ? confirmEnd : goLive}
                            style={tw.style(
                                'px-8 h-14 rounded-full items-center justify-center',
                                isLive ? 'bg-white' : 'bg-[#F02C56]',
                                (!channel || phase === 'connecting' || phase === 'ending') && 'opacity-50'
                            )}
                        >
                            {phase === 'connecting' || phase === 'ending' ? (
                                <ActivityIndicator color={isLive ? '#000' : '#fff'} />
                            ) : (
                                <Text style={tw.style('font-bold text-base', isLive ? 'text-black' : 'text-white')}>
                                    {isLive ? 'End' : 'Go live'}
                                </Text>
                            )}
                        </Pressable>

                        <Pressable
                            onPress={() => setMuted((m) => !m)}
                            style={tw`w-12 h-12 rounded-full bg-black/60 items-center justify-center`}
                        >
                            <Ionicons name={muted ? 'mic-off-outline' : 'mic-outline'} size={24} color="#fff" />
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    )
}