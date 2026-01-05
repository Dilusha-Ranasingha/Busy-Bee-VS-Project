export interface MigrationResult<T> {
  migrated: boolean;
  value: T;
}

export function migrateTodoDb<T extends { meta?: any }>(db: any): MigrationResult<T> {
  // If db is null, caller should create fresh DB.
  if (!db) return { migrated: false, value: db };

  const meta = db.meta ?? {};
  const version = Number(meta.schemaVersion ?? 1);

  // v1 is current baseline.
  if (version === 1) {
    // normalize missing fields
    db.meta = {
      schemaVersion: 1,
      ...meta,
    };
    db.todos = Array.isArray(db.todos) ? db.todos : [];
    return { migrated: false, value: db };
  }

  // Example future upgrade path:
  // if (version === 0) { ... upgrade to v1 ... }

  // Unknown version: do not destroy data; just pass through.
  db.meta = { schemaVersion: version, ...meta };
  db.todos = Array.isArray(db.todos) ? db.todos : [];
  return { migrated: false, value: db };
}
