import { BrowserCacheLocation, LogLevel } from '@azure/msal-browser'

export const msalConfig = {
  auth: {
    clientId: "afa54493-e93e-4d98-ac3c-651e26eeac87",
    authority: "https://login.microsoftonline.com/a988ccd4-00ed-4bf3-a4d1-b5661f44abdf",
    redirectUri: "http://localhost:5173",
    postLogoutRedirectUri: "http://localhost:5173/login",
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message) => {
        if (level === LogLevel.Error) console.error('[MSAL]', message)
      },
      logLevel: LogLevel.Error,
    }
  }
}

export const loginRequest = {
  scopes: ["openid", "profile", "email", "User.Read"]
}