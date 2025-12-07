## Description

- Implementing a text replacement feature that allows users to define replacement rules that are applied when rendering book content.

- Replacement rules can be defined at multiple scopes:
  - **Global**: Applied to all books (stored in global viewSettings)
  - **Book**: Applied to a specific book (stored in book's viewSettings, synced across devices)
  - **Single**: Applied temporarily to the current view (not persisted)

- Rules support both simple string matching and regex patterns, with configurable ordering, enabling/disabling, and proper merging of global and book-specific rules.

- The replacement transformer processes HTML content while preserving structure, skipping script and style tags, and applying rules in order to text nodes only.

## Changes

**Modified:**
- `apps/readest-app/src/types/book.ts`
  - Added `ReplacementRule` interface with fields: `id`, `pattern`, `replacement`, `enabled`, `isRegex`, `order`
  - Added `ReplacementRulesConfig` interface extending `ViewSettings` to include `replacementRules?: ReplacementRule[]`

- `apps/readest-app/src/services/transformers/index.ts`
  - Registered `replacementTransformer` in the `availableTransformers` array

**Created:**
- `apps/readest-app/src/services/transformers/replacement.ts`
  - Implemented `replacementTransformer` that applies replacement rules during content transformation
  - Added helper functions:
    - `createReplacementRule`: Creates a new replacement rule with defaults
    - `mergeReplacementRules`: Merges global and book-specific rules (book rules take precedence)
    - `getMergedReplacementRules`: Gets all active rules for a book
    - `addReplacementRule`: Adds a rule at specified scope (single/book/global)
    - `removeReplacementRule`: Removes a rule by ID and scope
    - `updateReplacementRule`: Updates an existing rule
    - `toggleReplacementRule`: Toggles a rule's enabled state
    - `validateReplacementRulePattern`: Validates pattern syntax

- `apps/readest-app/src/__tests__/utils/replacement.test.ts`
  - Comprehensive test suite covering:
    - Basic string replacement functionality
    - Regex pattern replacement
    - Rule ordering (lower order numbers apply first)
    - Enabled/disabled rule filtering
    - Error handling for invalid regex patterns
    - HTML structure preservation
    - Script and style tag exclusion
    - Unicode and special character handling
    - Edge cases (empty patterns, undefined order, etc.)
    - Rule management functions (create, merge, validate)

## Validation

**Validation Method 1: Run test cases**

```bash
cd apps/readest-app

# Run all tests
pnpm test

# Run only replacement transformer tests
pnpm test replacement.test.ts

# Run tests in watch mode (auto-rerun on changes)
pnpm test --watch

# Run tests with coverage
pnpm test --coverage
```

The test suite verifies:
- Simple string replacements work correctly
- Regex replacements work with various patterns
- Multiple rules are applied in correct order
- Disabled rules are skipped
- Invalid regex patterns are handled gracefully without breaking transformation
- HTML structure is preserved during replacement
- Script and style tags are excluded from replacement
- Unicode characters are handled correctly
- Rule merging prioritizes book rules over global rules
- Rule validation works for both simple and regex patterns

**Validation Method 2: Linting and Type Checking**

```bash
cd apps/readest-app

# Run ESLint
pnpm lint

# Fix auto-fixable issues
pnpm lint --fix

# Check TypeScript types
npx tsc --noEmit
```

**Validation Method 3: Manual testing in browser**

1. Ensure you are using `nvm use v22`
2. Run `pnpm dev-web`
3. Open a book in the reader
4. Open browser console and run the following code to add a test replacement rule:

```javascript
const store = window.__READEST_GET_STATE__();
const urlId = window.location.pathname.split('/').pop();
const matchingKeys = Object.keys(store.viewStates || {}).filter(k => k.startsWith(urlId));
const bookKey = matchingKeys[0];
const viewSettings = store.getViewSettings(bookKey);

const existingRules = viewSettings.replacementRules || [];
existingRules.push({
  id: 'test-rule-' + Date.now(),
  pattern: 'the',
  replacement: 'THE',
  enabled: true,
  isRegex: false,
  order: 1
});

store.setViewSettings(bookKey, {
  ...viewSettings,
  replacementRules: existingRules
});

console.log('Added replacement rule! Now navigate to next page to see changes.');
```

5. Navigate to the next page to trigger content re-rendering
6. Verify that the replacement rule is applied (e.g., "the" → "THE")
7. Check browser console for `[REPLACEMENT]` log messages showing transformer activity

## Technical Details

- The transformer uses DOM parsing to preserve HTML structure while applying replacements only to text nodes
- Rules are sorted by `order` field (lower numbers apply first)
- Book-specific rules override global rules when they have the same ID
- Invalid regex patterns are caught and logged as warnings, allowing other rules to continue processing
- The transformer logs detailed information about rule application for debugging purposes
- Replacement rules are stored in `viewSettings.replacementRules` which syncs across devices as part of book config

## Next Steps

- Wire UI components to allow users to create, edit, and manage replacement rules
- Implement CFI-based scoping for "single" scope replacements (apply only to specific CFI locations)
- Add UI for viewing and managing replacement rules in book settings
- Consider adding import/export functionality for replacement rules
- Add visual indicators when replacements are active in the reader

