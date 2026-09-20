const { withEntitlementsPlist } = require('expo/config-plugins');

// Run after library plugins: free Personal Teams cannot provision these capabilities.
module.exports = (config) => withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    delete config.modResults['com.apple.developer.applesignin'];
    return config;
});
