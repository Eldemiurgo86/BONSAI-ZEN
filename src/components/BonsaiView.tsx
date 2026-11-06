'use client';
import dynamic from 'next/dynamic';
import { Component, type ReactNode } from 'react';
import type { BonsaiProps } from './Bonsai3D';

// Three.js pesa mucho: se carga solo en el navegador, después del primer pintado.
const BonsaiCanvas = dynamic(() => import('./Bonsai3D'), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center text-7xl" aria-hidden>🌳</div>,
});

class Fallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return <div className="flex h-full w-full items-center justify-center text-7xl" role="img" aria-label="Bonsái">🌳</div>;
    }
    return this.props.children;
  }
}

/** Vista del bonsái con respaldo visual si WebGL no está disponible. */
export function BonsaiView(props: BonsaiProps & { className?: string }) {
  const { className = 'h-56 w-full', ...rest } = props;
  return (
    <div className={`relative ${className}`}>
      <Fallback>
        <BonsaiCanvas {...rest} />
      </Fallback>
    </div>
  );
}
