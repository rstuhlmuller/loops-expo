import { Platform } from 'react-native';

export type ShareTargetId =
    | 'copy-link'
    | 'sms'
    | 'telegram'
    | 'whatsapp'
    | 'whatsapp-business'
    | 'other';

export type ShareTarget = {
    id: ShareTargetId;
    label: string;
    iconFamily: 'ionicons' | 'fa6';
    icon: string;
    bgColor?: string;
    androidPackage?: string;
    iosScheme?: string;
    alwaysAvailable?: boolean;
    buildUrl?: (url: string, text: string) => string;
};

export const SHARE_TARGETS: ShareTarget[] = [
    {
        id: 'copy-link',
        label: 'Copy link',
        iconFamily: 'ionicons',
        icon: 'link',
        bgColor: '#3B82F6',
        alwaysAvailable: true,
    },
    {
        id: 'sms',
        label: 'SMS',
        iconFamily: 'ionicons',
        icon: 'chatbubble',
        bgColor: '#34C759',
        alwaysAvailable: true,
        buildUrl: (url, text) =>
            Platform.OS === 'ios'
                ? `sms:&body=${encodeURIComponent(`${url}`)}`
                : `sms:?body=${encodeURIComponent(`${url}`)}`,
    },
    {
        id: 'email',
        label: 'Email',
        iconFamily: 'ionicons',
        icon: 'mail-outline',
        bgColor: '#f27e2c',
        alwaysAvailable: true,
        buildUrl: (url, text) =>
            Platform.OS === 'ios'
                ? `mailto:?body=${encodeURIComponent(`${url}`)}`
                : `mailto:?body=${encodeURIComponent(`${url}`)}`,
    },
    {
        id: 'mastodon',
        label: 'Mastodon',
        iconFamily: 'ionicons',
        icon: 'logo-mastodon',
        bgColor: '#6364FF',
        alwaysAvailable: true,
        androidPackage: 'org.joinmastodon.android',
        buildUrl: (url, text) =>
            `https://share.joinmastodon.org/?text=${encodeURIComponent(`${url}`)}`,
    },
    {
        id: 'telegram',
        label: 'Telegram',
        iconFamily: 'fa6',
        icon: 'telegram',
        bgColor: '#229ED9',
        androidPackage: 'org.telegram.messenger',
        iosScheme: 'tg://',
        buildUrl: (url, text) =>
            `tg://msg_url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    },
    {
        id: 'whatsapp',
        label: 'WhatsApp',
        iconFamily: 'fa6',
        icon: 'whatsapp',
        bgColor: '#25D366',
        androidPackage: 'com.whatsapp',
        iosScheme: 'whatsapp://',
        buildUrl: (url, text) => `whatsapp://send?text=${encodeURIComponent(`${url}`)}`,
    },
    {
        id: 'whatsapp-business',
        label: 'WA Business',
        iconFamily: 'fa6',
        icon: 'whatsapp',
        bgColor: '#128C7E',
        androidPackage: 'com.whatsapp.w4b',
        buildUrl: (url, text) => `whatsapp://send?text=${encodeURIComponent(`${url}`)}`,
    },
    {
        id: 'other',
        label: 'Other',
        iconFamily: 'ionicons',
        icon: 'share-outline',
        alwaysAvailable: true,
    },
];

export function targetIdentifier(target: ShareTarget): string | undefined {
    return Platform.OS === 'android' ? target.androidPackage : target.iosScheme;
}
