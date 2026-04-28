import crypto from 'crypto';
import OAuth from 'oauth-1.0a';

const BASE_URL = process.env.ETRADE_BASE_URL || 'https://api.etrade.com';

function makeOAuth() {
  return new OAuth({
    consumer: {
      key: process.env.ETRADE_CONSUMER_KEY,
      secret: process.env.ETRADE_CONSUMER_SECRET,
    },
    signature_method: 'HMAC-SHA1',
    hash_function(base, key) {
      return crypto.createHmac('sha1', key).update(base).digest('base64');
    },
  });
}

async function oauthFetch(url, token = null, method = 'GET') {
  const oauth = makeOAuth();
  const tokenData = token ? { key: token.key, secret: token.secret } : null;
  const authHeader = oauth.toHeader(oauth.authorize({ url, method }, tokenData));
  const res = await fetch(url, {
    method,
    headers: { ...authHeader, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`E*TRADE ${method} ${url} → ${res.status}`);
  return res.json();
}

export async function getRequestToken() {
  const url = `${BASE_URL}/oauth/request_token`;
  const oauth = makeOAuth();
  const authHeader = oauth.toHeader(
    oauth.authorize({ url, method: 'GET' }, null)
  );
  const res = await fetch(url, {
    headers: { ...authHeader, Accept: 'application/x-www-form-urlencoded' },
  });
  const text = await res.text();
  const params = new URLSearchParams(text);
  return { key: params.get('oauth_token'), secret: params.get('oauth_token_secret') };
}

export function buildAuthUrl(requestToken) {
  return `${BASE_URL}/oauth/authorize?key=${requestToken.key}`;
}

export async function getAccessToken(requestToken, verifier) {
  const url = `${BASE_URL}/oauth/access_token`;
  const oauth = makeOAuth();
  const authHeader = oauth.toHeader(
    oauth.authorize(
      { url, method: 'GET' },
      { key: requestToken.key, secret: requestToken.secret }
    )
  );
  const res = await fetch(`${url}?oauth_verifier=${verifier}`, {
    headers: { ...authHeader, Accept: 'application/x-www-form-urlencoded' },
  });
  const text = await res.text();
  const params = new URLSearchParams(text);
  return { key: params.get('oauth_token'), secret: params.get('oauth_token_secret') };
}

export async function fetchAccounts(accessToken) {
  const data = await oauthFetch(`${BASE_URL}/v1/accounts/list.json`, accessToken);
  return data?.AccountListResponse?.Accounts?.Account || [];
}

export async function fetchPortfolio(accessToken, accountIdKey) {
  const url = `${BASE_URL}/v1/accounts/${accountIdKey}/portfolio.json`;
  return oauthFetch(url, accessToken);
}

export async function fetchBalance(accessToken, accountIdKey) {
  const url = `${BASE_URL}/v1/accounts/${accountIdKey}/balance.json?instType=BROKERAGE&realTimeNAV=true`;
  return oauthFetch(url, accessToken);
}
