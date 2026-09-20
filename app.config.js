module.exports = ({ config }) => {
    const isLocalDevelopment = process.env.APP_VARIANT === 'development';
    if (!isLocalDevelopment) return config;

    return {
        ...config,
        name: 'Loops Dev',
        scheme: 'loops-dev',
        ios: {
            ...config.ios,
            bundleIdentifier: process.env.IOS_DEV_BUNDLE_ID || `${config.ios.bundleIdentifier}.dev`,
            usesAppleSignIn: false,
        },
        // Mods execute in reverse registration order; register cleanup first.
        plugins: ['./plugins/withPersonalTeam', ...(config.plugins || [])],
    };
};
