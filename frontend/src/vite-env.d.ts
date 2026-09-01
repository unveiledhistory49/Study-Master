/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly OPENCODE_ZEN_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
