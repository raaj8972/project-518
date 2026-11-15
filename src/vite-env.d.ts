/// <reference types="vite/client" />

declare namespace JSX {
  interface IntrinsicElements {
    'dotlottie-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      src?: string; background?: string; speed?: string; loop?: boolean; autoplay?: boolean;
    };
  }
}
