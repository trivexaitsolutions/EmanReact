const googleServices = require("./google-services.json");

module.exports = ({ config }) => {
  const androidPackage = config.android?.package;
  const matchingAndroidClient = googleServices.client?.find(
    (client) =>
      client.client_info?.android_client_info?.package_name === androidPackage,
  );

  // EAS/CI can override the bundled Firebase project key with a dedicated,
  // Android-restricted Maps key. Mobile API keys still need package + SHA-1
  // restrictions in Google Cloud Console.
  const googleMapsApiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    matchingAndroidClient?.api_key?.[0]?.current_key;

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          ...config.android?.config?.googleMaps,
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
