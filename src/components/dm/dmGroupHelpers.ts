import type { DmConversation } from '@/types/dm';
import { dmDisplayName } from './dmHelpers';

export function conversationParticipants(conversation?: DmConversation | null) {
    return (
        conversation?.participants ?? (conversation?.participant ? [conversation.participant] : [])
    );
}

export function conversationMemberCount(conversation?: DmConversation | null) {
    return conversationParticipants(conversation).filter(
        (participant) => participant.state !== 'left',
    ).length;
}

export function conversationDisplayName(conversation?: DmConversation | null) {
    return (
        conversation?.title?.trim() ||
        conversationParticipants(conversation).map(dmDisplayName).join(', ') ||
        'Group conversation'
    );
}
