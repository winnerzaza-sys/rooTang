/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_GOOGLE_MAP_ID?: string;
  readonly VITE_DATA_MODE?: 'mock' | 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
