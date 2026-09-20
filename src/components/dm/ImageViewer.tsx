import type { DmMediaEntity } from '@/types/dm';
import { Image } from 'expo-image';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ImageViewer({
    visible,
    media,
    onClose,
}: {
    visible: boolean;
    media: DmMediaEntity | null;
    onClose: () => void;
}) {
    const insets = useSafeAreaInsets();
    return (
        <Modal visible={visible} onRequestClose={onClose} animationType="fade">
            <View style={{ flex: 1, backgroundColor: '#000' }}>
                {media && (
                    <Image
                        source={{ uri: media.url }}
                        contentFit="contain"
                        accessibilityLabel={media.description ?? 'Message image'}
                        style={{ flex: 1 }}
                    />
                )}
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close image"
                    onPress={onClose}
                    style={{
                        position: 'absolute',
                        top: insets.top + 12,
                        right: 16,
                        padding: 16,
                        backgroundColor: '#222',
                        borderRadius: 24,
                    }}>
                    <Text style={{ color: '#fff' }}>Close</Text>
                </Pressable>
            </View>
        </Modal>
    );
}
