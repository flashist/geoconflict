# HF-10 — Cache Busting & Build Freshness Guarantee

## Priority
Post-Sprint 2 hotfix — critical. Players running stale cached builds may still be experiencing bugs that have already been fixed in production (double-reload, mobile hit area, auto-spawn failure). Every player on a cached old build is also reporting analytics under a wrong or missing build number, corrupting the clean data baseline established by HF-7 and HF-9.

## Problem

GameAnalytics is receiving events from older build versions and from sessions with no build version at all, despite newer builds having been deployed. The cause is browser caching — when a new build is deployed, browsers that have previously visited the game serve the cached old bundle instead of fetching the new one.

There are three layers where stale content can be served, each requiring a different fix.

---

## Part A — Investigation: Current Cache Configuration

**Do this before making any changes.**

Answer the following:

1. **Are JavaScript/CSS bundle filenames currently content-hashed?**
   - Check the build tool config (Vite `vite.config.ts` or Webpack config)
   - Expected: output filenames like `main.a3f9c2d1.js`, not `main.js`
   - If not hashed, this is the primary fix

2. **What Cache-Control headers is the server currently sending for:**
   - The HTML entry point (`yandex-games_iframe.html` or equivalent)
   - JavaScript bundles
   - CSS bundles
   - Use browser DevTools → Network tab → inspect response headers on a fresh load

3. **How does Yandex Games handle caching in the iframe context?**
   - Check Yandex Games developer documentation for whether they cache game assets at their CDN level
   - Confirm whether `Cache-Control` headers set by the game server are respected end-to-end or overridden by Yandex

Document findings before proceeding to Part B.

---

## Part B — Bundle Filename Hashing

If bundle filenames are not already content-hashed, configure the build tool to append a content hash to all output filenames.

**Vite:**
```ts
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
      },
    },
  },
};
```

**Webpack:**
```js
// webpack.config.js
output: {
  filename: '[name].[contenthash].js',
  chunkFilename: '[name].[contenthash].js',
}
```

**Effect:** when the bundle contents change, the hash changes, the filename changes, and the browser has no cached version of the new filename — it must fetch fresh. Old cached filenames remain in cache harmlessly and expire naturally.

**After this change:** the HTML entry point will reference the new hashed filenames, which means the HTML itself must always be fetched fresh — covered in Part C.

---

## Part C — HTML Entry Point Cache Headers

The HTML file must be served with headers that prevent caching. It is small (fetched once per session) so the performance cost is negligible.

Set the following response headers on the HTML entry point:

```
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

**Nginx:**
```nginx
location = /yandex-games_iframe.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}
```

**Express (if serving static files via Node):**
```ts
app.get('/yandex-games_iframe.html', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(/* path to html */);
});
```

**JS/CSS bundles** — once filename hashing is in place, bundles can be cached aggressively since the filename changes on every build:
```
Cache-Control: public, max-age=31536000, immutable
```

---

## Part D — Yandex Games Iframe Context

Based on the Part A investigation findings, take the appropriate action:

- **If Yandex respects Cache-Control headers:** Parts B and C are sufficient.
- **If Yandex has its own CDN caching layer:** check whether there is a cache invalidation step required on publish. Document this as a required step in the deployment process.
- **If Yandex caching behaviour is unclear:** post in the Yandex Games developer community or support channel with the specific question: "Do Cache-Control headers set by the game origin server affect how Yandex Games caches iframe game assets?"

---

## Verification

1. Deploy a new build after Parts B and C are applied
2. In browser DevTools → Network tab, hard-reload the game (Ctrl+Shift+R)
3. Confirm the HTML entry point response includes `Cache-Control: no-cache, no-store, must-revalidate`
4. Confirm JS bundle filenames include a content hash
5. Soft-reload (F5) immediately after — confirm the browser fetches HTML fresh but uses cached JS bundles (304 or from cache for bundles is correct)
6. Deploy a second trivial build change — confirm the JS bundle filename changes and the browser fetches the new bundle
7. In GameAnalytics, confirm no events appear under previous build versions 48 hours after deploy

## Notes

- **`BUILD_NUMBER` update reminder:** with hashed bundles in place, the `BUILD_NUMBER` constant (HF-7) must still be updated manually on each deploy — the hash in the filename is not automatically reflected in the GameAnalytics dimension value. Consider a pre-deploy checklist: (1) update `BUILD_NUMBER`, (2) register new build value in GA dashboard, (3) deploy. If this proves error-prone, the build pipeline can be configured to inject `BUILD_NUMBER` automatically from `package.json` version + a timestamp or commit SHA.
- **Existing stale sessions:** players currently running a cached old build will continue to do so until they hard-refresh or their cache expires. There is no way to force-refresh already-cached sessions remotely. The fix only guarantees freshness for new loads after the deploy.
- **Service workers:** if a service worker is ever added, it intercepts all network requests including the HTML entry point and can override Cache-Control headers entirely. Cache busting strategy must be revisited at that point.
