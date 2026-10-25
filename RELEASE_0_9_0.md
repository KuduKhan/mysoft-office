# MySoft Office v0.9.0 — Studio 2.0

## Scope
Visual consistency, responsive workspace ergonomics, keyboard accessibility and regression coverage. This builds on the green v0.8.2 release without replacing any of the six document editors.

## Included
- Last-loaded `src/studio-v090.css` design layer: consistent workspace, ribbon, editor shell, active-file tab, border, focus and elevation treatment.
- Breakpoints for 320px+ phone, tablet, laptop and desktop layouts; internal ribbon and tab scrolling instead of page-level overflow.
- Coarse-pointer hit targets, reduced-motion support, forced-colors/high-contrast fallback, safe-area adjustments and clean print overrides.
- Recent-file strip keyboard navigation: ArrowLeft/ArrowRight/Home/End shift focus without opening a different document; Enter/Space or mouse/touch activation is unchanged.
- Unit tests of the pure navigation index model and Playwright tests for viewport fitting, editor save/reload and keyboard focus.

## Data safety
No IndexedDB migration, server/database change, document model change, OOXML adapter change, cloud sign-in change or destructive file operation. Existing offline documents must remain readable without migration.

## Release gates
- `npm run check:repo`, `npm test` and `npm run build` pass.
- Browser smoke tests including Studio 2.0, storage, all six editors and independent OOXML validation pass on the exact PR commit.
- Manually review phone/tablet/desktop in light and dark themes; zoom to 200%; test portrait rotation, keyboard navigation and touch input on physical devices before production deployment.
- Protect main with required status checks and merge only after both CI jobs are successful.
