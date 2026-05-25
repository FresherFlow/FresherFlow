module.exports = ({ config }) => {
  const appEnv = process.env.APP_ENV || process.env.EXPO_PUBLIC_APP_ENV || 'development';
  
  const isProd = appEnv === 'production';
  const isStaging = appEnv === 'staging';
  const isDev = appEnv === 'development';

  // Determine app name, package/bundle identifier, and scheme based on environment
  let appName = config.name;
  let bundleIdentifier = config.ios?.bundleIdentifier || "in.fresherflow.app";
  let androidPackage = config.android?.package || "in.fresherflow.app";
  let scheme = config.scheme || "fresherflow";

  // Select the appropriate google-services.json file
  // Production gets the main google-services.json
  // Staging and Development get the google-services.dev.json
  const googleServicesFile = isProd ? "./google-services.json" : "./google-services.dev.json";

  if (isStaging) {
    appName = "FresherFlow (Staging)";
    bundleIdentifier = "in.fresherflow.app.staging";
    androidPackage = "in.fresherflow.app.staging";
    scheme = "fresherflow-staging";
  } else if (isDev) {
    appName = "FresherFlow (Dev)";
    bundleIdentifier = "in.fresherflow.app.dev";
    androidPackage = "in.fresherflow.app.dev";
    scheme = "fresherflow-dev";
  }

  // Base configuration updates
  const updatedConfig = {
    ...config,
    name: appName,
    scheme: scheme,
    updates: {
      ...(config.updates || {}),
      enabled: !isDev,
      checkAutomatically: isDev ? "NEVER" : "ON_LOAD",
      fallbackToCacheTimeout: 30000,
    },
    ios: {
      ...config.ios,
      bundleIdentifier: bundleIdentifier,
    },
    android: {
      ...config.android,
      package: androidPackage,
      googleServicesFile: googleServicesFile,
    },
    extra: {
      ...(config.extra || {}),
      appEnv: appEnv,
      firebaseRtdbUrl: process.env.EXPO_PUBLIC_FIREBASE_RTDB_URL || '',
    },
  };

  // Rewrite deep link hosts to staging.fresherflow.in for staging build
  if (isStaging && updatedConfig.android && updatedConfig.android.intentFilters) {
    updatedConfig.android.intentFilters = updatedConfig.android.intentFilters.map(filter => {
      if (filter.data) {
        const mappedData = (Array.isArray(filter.data) ? filter.data : [filter.data]).map(d => {
          if (d.host === 'fresherflow.in') {
            return { ...d, host: 'staging.fresherflow.in' };
          }
          return d;
        });
        return { ...filter, data: mappedData };
      }
      return filter;
    });
  }

  return updatedConfig;
};
