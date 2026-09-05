import { LiveChatMessage } from '@/components/live/LiveChatMessage'
import type { LiveMessage } from '@/types/live'
import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { useCallback, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import tw from 'twrnc'

type Props = {
    messages: LiveMessage[]
    canChat: boolean
    isGuest: boolean
    chatEnabled: boolean
    onSend: (body: string) => void
    onLongPressMessage?: (message: LiveMessage) => void
}

export function LiveChatOverlay({
    messages,
    canChat,
    isGuest,
    chatEnabled,
    onSend,
    onLongPressMessage,
}: Props) {
    const [draft, setDraft] = useState('')

    const submit = useCallback(() => {
        const value = draft.trim()
        if (!value) {
            return
        }
        onSend(value)
        setDraft('')
    }, [draft, onSend])

    const renderItem = useCallback(
        ({ item }: { item: LiveMessage }) => (
            <LiveChatMessage message={item} onLongPress={onLongPressMessage} />
        ),
        [onLongPressMessage]
    )

    return (
        <View style={tw`w-full`}>
            <View style={tw`h-30`}>
                <FlashList
                    inverted
                    data={messages}
                    renderItem={renderItem}
                    keyExtractor={(item) => String(item.seq)}
                    estimatedItemSize={32}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                />
            </View>

            {canChat ? (
                <View style={tw`flex-row items-center px-3 pt-2 pb-1`}>
                    <TextInput
                        value={draft}
                        onChangeText={setDraft}
                        onSubmitEditing={submit}
                        placeholder="Say something"
                        placeholderTextColor="#a1a1aa"
                        maxLength={200}
                        returnKeyType="send"
                        style={tw`flex-1 bg-black/60 text-white text-sm rounded-full px-4 py-2.5`}
                    />
                    <Pressable
                        onPress={submit}
                        disabled={!draft.trim()}
                        style={tw.style(
                            'ml-2 w-10 h-10 rounded-full items-center justify-center',
                            draft.trim() ? 'bg-[#F02C56]' : 'bg-zinc-800'
                        )}
                    >
                        <Ionicons name="arrow-up" size={20} color="#fff" />
                    </Pressable>
                </View>
            ) : (
                <View style={tw`px-4 pt-2 pb-2`}>
                    <Text style={tw`text-zinc-400 text-xs`}>
                        {!chatEnabled
                            ? 'Chat is off for this stream'
                            : isGuest
                                ? 'Sign in to join the chat'
                                : 'Chat is closed'}
                    </Text>
                </View>
            )}
        </View>
    )
}