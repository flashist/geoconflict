# Localization

**Layer**: client
**Key files**: `src/client/LangSelector.ts`, `src/client/Utils.ts`, `src/client/flashist/FlashistFacade.ts`, `resources/lang/en.json`, `resources/lang/ru.json`, `resources/lang/debug.json`

## Summary

Client-side localization for static HTML, Lit components, game UI overlays, and repo-authored content. The system loads bundled JSON language files, chooses the closest supported language from saved preference, browser locale, or Yandex SDK locale, and falls back to English when a key is missing in the selected language.

## Architecture

`LangSelector.ts` imports the supported `resources/lang/*.json` files into a `languageMap`, flattens nested translation objects into dot keys, and keeps both `translations` for the active language and `defaultTranslations` for English fallback. `initializeLanguage()` prefers the Yandex SDK language from `FlashistFacade.instance.getLanguageCode()` when present, otherwise uses `navigator.language`, then applies any saved `localStorage["lang"]` preference.

`translateText()` in `src/client/Utils.ts` is the common helper used by most components. It reads the current `<lang-selector>`, falls back to English if needed, caches `IntlMessageFormat` instances per language/message, and returns the key if no translation is available. `LangSelector.applyTranslation()` also updates `[data-i18n]` static DOM nodes and requests Lit component updates for known UI tags after a language change.

`FlashistFacade.getLanguageCode()` maps Yandex platform locales to the project's supported language set, currently returning Russian for `ru`, `be`, `kk`, `uk`, and `uz`, and English as the default. Feature-specific localized content can also live outside `resources/lang`, such as `resources/announcements.json`, as long as it provides English fallback text.

## Gotchas / Known Issues

- `translateText()` returns the key before `<lang-selector>` is mounted or before translations are loaded, so startup code that needs localized text should wait for `langReadyPromise` where possible.
- English is the fallback language; new player-facing keys should be added to `resources/lang/en.json` and the actively maintained target locales, especially `resources/lang/ru.json`.
- `LangSelector` only imports languages listed in its `languageMap`. Adding a JSON file under `resources/lang/` does not make it selectable until the component imports and registers it.
- The Yandex locale bridge is intentionally narrower than the full language list and currently maps several CIS locales to Russian.
- `data-i18n` updates only text content. Components with attributes, placeholders, or dynamic text should call `translateText()` directly and rerender on language changes.

## Related

- [[systems/flashist-init]] — Yandex SDK startup and locale lookup used by language initialization
- [[features/announcements]] — localized repo-authored announcement content with English fallback
- [[systems/project-operations]] — release workflow that requires localized copy changes to ship in builds
