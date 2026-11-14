/**
 * Minimal ambient types for sql.js.
 *
 * The published package does not ship TypeScript declarations, so the subset of
 * the API that CredVault uses is declared here. See https://sql.js.org for the
 * full API surface.
 */
declare module 'sql.js' {
  type SqlValue = string | number | null;

  interface SqlStatement {
    bind(params: ReadonlyArray<SqlValue>): void;
    step(): boolean;
    getAsObject(): Record<string, SqlValue>;
    free(): void;
  }

  interface SqlDatabase {
    run(sql: string, params?: ReadonlyArray<SqlValue>): void;
    exec(sql: string): unknown;
    prepare(sql: string): SqlStatement;
    export(): Uint8Array;
    close(): void;
  }

  interface SqlJsConfig {
    locateFile?: (file: string) => string;
  }

  interface SqlJsStatic {
    Database: new (data?: Uint8Array) => SqlDatabase;
  }

  const initSqlJs: (config?: SqlJsConfig) => Promise<SqlJsStatic>;
  export default initSqlJs;
}
