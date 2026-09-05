import type { LiveMessage } from '@/types/live'
import { memo } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import tw from 'twrnc'

type Props = {
    message: LiveMessage
    onLongPress?: (message: LiveMessage) => void
}

function LiveChatMessageBase({ message, onLongPress }: Props) {
    if (message.type === 'system') {
        return (
            <View style={tw`px-3 py-1`}>
                <Text style={tw`text-zinc-300 text-xs italic`}>{message.body}</Text>
            </View>
        )
    }

    return (
        <Pressable
            onLongPress={() => onLongPress?.(message)}
            delayLongPress={350}
            style={tw.style('flex-row items-center px-3 py-1', message.failed && 'opacity-50')}
        >
            {message.profile?.avatar ? (
                <Image
                    source={{ uri: message.profile.avatar }}
                    style={tw`w-6 h-6 rounded-full mr-2 mt-0.5 bg-zinc-800`}
                />
            ) : (
                <View style={tw`w-6 h-6 rounded-full mr-2 mt-0.5 bg-zinc-800`} />
            )}

            <View style={tw`flex-1`}>
                <Text style={tw`text-white text-sm leading-5`}>
                    <Text style={tw`text-zinc-200 font-semibold`}>
                        {message.profile?.username ?? 'unknown'}
                    </Text>
                    <Text style={tw`text-zinc-500`}>  </Text>
                    {message.body}
                </Text>
                {message.failed ? (
                    <Text style={tw`text-red-400 text-xs mt-0.5`}>Not sent</Text>
                ) : null}
            </View>
        </Pressable>
    )
}

export const LiveChatMessage = memo(LiveChatMessageBase)