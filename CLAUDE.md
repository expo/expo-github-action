# Claude Development Guidelines

## Code Style Preferences

### Comments
- **Minimal comments**: Only add comments when they provide meaningful context
- Avoid redundant comments that simply describe what the code does
- Examples:
  ```typescript
  // ❌ Bad - redundant
  // Create fingerprint with platform ios and artifacts
  await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash1', {
    fingerprint: { sources: [], hash: 'hash1' },
    platform: 'ios',
  });

  // ✅ Good - no unnecessary comments
  await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash1', {
    fingerprint: { sources: [], hash: 'hash1' },
    platform: 'ios',
  });
  ```

### Test Organization
- Use dedicated `describe` blocks for complex functions with multiple test cases
- Group related tests logically within describe blocks
- Prefer explicit method calls over hidden complexity in helper functions

### Database/API Design
- Favor explicit method calls over hidden side effects in parameters
- Example refactoring pattern:
  ```typescript
  // ❌ Before - complex parameter with side effects
  await upsertFingerprintByGitCommitHashAsync('gitHash', {
    fingerprint: { sources: [], hash: 'hash1' },
    githubArtifacts: [{ ... }]  // Hidden complexity
  });

  // ✅ After - explicit and clear
  await upsertFingerprintByGitCommitHashAsync('gitHash', {
    fingerprint: { sources: [], hash: 'hash1' }
  });

  const fingerprint = await getEntityFromGitCommitHashAsync('gitHash');
  const artifactsManager = getArtifactsManager();
  await artifactsManager.insertArtifactAsync({
    fingerprintId: fingerprint.id,
    // ... explicit parameters
  });
  ```

## Testing Patterns

### Test Structure for Complex Functions
```typescript
describe('functionName', () => {
  it('should handle basic functionality', async () => {
    // Test basic case
  });

  it('should handle edge case A', async () => {
    // Test specific edge case
  });

  it('should return null when conditions not met', async () => {
    // Test negative cases
  });

  it('should prioritize correctly when multiple matches exist', async () => {
    // Test ordering/priority logic
  });
});
```

### Database Testing Best Practices
- Use explicit `insertArtifactAsync` calls rather than complex parameters
- Test both positive and negative cases
- Verify ordering behavior with multiple records
- Test platform matching logic thoroughly

## SQL Query Design

### Platform Matching Logic
When implementing platform-aware queries, use AND logic for strict matching:
```sql
-- ✅ Correct - both artifact AND fingerprint platform must align
WHERE f.fingerprint_hash = ? AND (ga.platform = ? AND (f.platform = ? OR f.platform IS NULL))

-- ❌ Incorrect - too permissive
WHERE f.fingerprint_hash = ? AND (ga.platform = ? OR (f.platform = ? OR f.platform IS NULL))
```

## Type Safety

### Parameter Design
- Use optional parameters with `undefined` rather than explicit `null` where possible
- Remove unused methods to keep API surface clean
- Prefer strongly typed interfaces over generic objects

## Development Commands

### Type Checking
```bash
bun run tsc
```

### Testing
```bash
bun test src/fingerprint/__tests__/FingerprintDbManager.test.ts
```

## Recent Refactoring Lessons

### Function Consolidation (2024-09-30)
Successfully refactored fingerprint database functions:

**Removed:**
- `getGitHubArtifactsForFingerprintAsync`
- `getFirstEntityWithGitHubArtifactsFromFingerprintHashAsync`
- `upsertArtifactAsync` (unused)
- `githubArtifacts` parameter from `upsertFingerprintByGitCommitHashAsync`

**Added:**
- `getFirstGitHubArtifactAsync(fingerprintHash: string, platform: string)`
- `getArtifactsManager()` helper method

**Key SQL Logic:**
```sql
SELECT ga.* FROM fingerprint f
JOIN github_artifacts ga ON f.id = ga.fingerprint_id
WHERE f.fingerprint_hash = ?
  AND (ga.platform = ? AND (f.platform = ? OR f.platform IS NULL))
ORDER BY f.id ASC, ga.id ASC
LIMIT 1
```

This refactoring improved:
- **Separation of concerns**: Fingerprint management vs artifact management
- **Type safety**: Removed complex nested parameters
- **API clarity**: Explicit method calls vs hidden side effects
- **Performance**: Single query instead of multiple lookups