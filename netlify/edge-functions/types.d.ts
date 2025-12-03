// Type declarations for Netlify Edge Functions (Deno runtime)

declare namespace Deno {
  export namespace env {
    export function get(key: string): string | undefined;
  }
}
