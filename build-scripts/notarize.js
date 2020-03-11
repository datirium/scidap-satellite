require('dotenv').config();
const { notarize } = require('electron-notarize');

const password = `@keychain:AC_SS_PASSWORD`;

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: 'com.datirium.scidap-satellite',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: password,
    ascProvider: process.env.TEAM_ID,
  });
};
