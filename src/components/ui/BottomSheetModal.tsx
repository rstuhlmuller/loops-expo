import type { PropsWithChildren } from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

type Props = PropsWithChildren<{
    visible: boolean;
    onClose: () => void;
    containerStyle?: StyleProp<ViewStyle>;
    cancelSpacing?: boolean;
}>;

export function BottomSheetModal({
    visible,
    onClose,
    containerStyle,
    cancelSpacing = true,
    children,
}: Props) {
    const insets = useSafeAreaInsets();
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={tw`flex-1 justify-end`}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close menu"
                    onPress={onClose}
                    style={[StyleSheet.absoluteFill, tw`bg-black/50`]}
                />
                <View
                    accessibilityViewIsModal
                    style={[tw`bg-white dark:bg-gray-900 rounded-t-3xl pt-3`, containerStyle]}>
                    {children}
                    {cancelSpacing && (
                        <Pressable
                            accessibilityRole="button"
                            onPress={onClose}
                            style={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
                            <Text style={tw`text-center text-black dark:text-white`}>Cancel</Text>
                        </Pressable>
                    )}
                </View>
            </View>
        </Modal>
    );
}
