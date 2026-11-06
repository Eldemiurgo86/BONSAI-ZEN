import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl" aria-hidden>🍂</p>
      <h1 className="font-display text-3xl font-bold">Página no encontrada.</h1>
      <Link href="/" className="btn btn-moss">Ir al inicio</Link>
    </main>
  );
}
