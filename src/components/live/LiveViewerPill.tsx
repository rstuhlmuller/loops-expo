import { Ionicons } from '@expo/vector-icons'
import { Text, View } from 'react-native'
import tw from 'twrnc'

type Props = {
    count: number
    live: boolean
}

export function LiveViewerPill({ count, live }: Props) {
    return (
        <View style={tw`flex-row items-center`}>
            <View
                style={tw.style(
                    'flex-row items-center rounded-md px-2 py-1 mr-2',
                    live ? 'bg-[#F02C56]' : 'bg-zinc-700'
                )}
            >
                <Text style={tw`text-white text-xs font-bold`}>{live ? 'LIVE' : 'ENDED'}</Text>
            </View>
            <View style={tw`flex-row items-center bg-black/50 rounded-md px-2 py-1`}>
                <Ionicons name="eye-outline" size={13} color="#fff" />
                <Text style={tw`text-white text-xs font-semibold ml-1`}>{count}</Text>
            </View>
        </View>
    )
}