import type { DmConversation } from '@/types/dm';
import { Pressable, ScrollView, Text } from 'react-native';
import tw from 'twrnc';
import { BottomSheetModal } from '../ui/BottomSheetModal';
import { conversationDisplayName, conversationParticipants } from './dmGroupHelpers';
import { dmDisplayName } from './dmHelpers';

type Props = {
    visible: boolean;
    conversation: DmConversation;
    onClose: () => void;
    onLeave: () => void;
    leaving: boolean;
    onOpenProfile: (id: string) => void;
};

export function GroupInfoSheet({
    visible,
    conversation,
    onClose,
    onLeave,
    leaving,
    onOpenProfile,
}: Props) {
    return (
        <BottomSheetModal visible={visible} onClose={onClose} containerStyle={{ maxHeight: '85%' }}>
            <Text style={tw`text-lg font-bold text-black dark:text-white px-5 py-3`}>
                {conversationDisplayName(conversation)}
            </Text>
            <ScrollView>
                {conversationParticipants(conversation)
                    .filter((p) => p.state !== 'left')
                    .map((participant) => (
                        <Pressable
                            key={participant.id}
                            accessibilityRole="button"
                            onPress={() => onOpenProfile(participant.id)}
                            style={tw`px-5 py-4`}>
                            <Text style={tw`text-black dark:text-white`}>
                                {dmDisplayName(participant)}
                            </Text>
                            <Text style={tw`text-gray-500`}>@{participant.username}</Text>
                        </Pressable>
                    ))}
            </ScrollView>
            <Pressable
                accessibilityRole="button"
                disabled={leaving}
                onPress={onLeave}
                style={tw`px-5 py-4`}>
                <Text style={tw`text-red-500`}>{leaving ? 'Leaving…' : 'Leave group'}</Text>
            </Pressable>
        </BottomSheetModal>
    );
}
