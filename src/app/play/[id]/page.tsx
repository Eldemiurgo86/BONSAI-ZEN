'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Board } from '@/components/Board';
import { BonsaiView } from '@/components/BonsaiView';
import { StoryDialog } from '@/components/StoryDialog';
import { Chip, Loading, Notice } from '@/components/ui';
import { CHAPTERS } from '@/data/story';
import { levelById } from '@/data/levels';
import { applyDifficulty } from '@/game/difficulty';
import { createGame, goalsProgress, getHint, type GameState } from '@/game/engine';
import { newSeed } from '@/game/rng';
import { api, ApiClientError } from '@/lib/api-client';
import type { FinishResponse } from '@/lib/dto';
import { useSessionGate } from '@/lib/use-session-gate';
import { useT } from '@/lib/use-t';
import { sfx } from '@/lib/sound';
import { useGame } from '@/store/game';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import type { Booster, Difficulty } from '@/game/types';
import type { TranslationKey } from '@/data/i18n';
import { BOOSTERS } from '@/game/types';

const BOOSTER_ICON: Record<Booster, string> = { scissors: '✂️', rain: '🌧️', fertilizer: '🧪' };
const BOOSTER_LABEL: Record<Booster, TranslationKey> = { scissors: 'play.scissors', rain: 'play.rain', fertilizer: 'play.fertilizer' };
const IDLE_HINT_MS = 6000;
const CHAPTER_SEEN_KEY = 'bz-chapter-seen-';

function chapterSeen(season: string): boolean {
  try {
    return localStorage.getItem(CHAPTER_SEEN_KEY + season) === '1';
  } catch {
    return true;
  }
}
function markChapterSeen(season: string) {
  try {
    localStorage.setItem(CHAPTER_SEEN_KEY + season, '1');
  } catch {
    // Almacenamiento no disponible: la historia simplemente volverá a mostrarse.
  }
}

type Phase = 'checking' | 'story' | 'starting' | 'playing' | 'finishing' | 'nolives' | 'error';

export default function PlayPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const levelId = Number(params.id);
  const level = levelById(levelId);
  const { ready, user, progress } = useSessionGate();
  const animations = useSettings((s) => s.animations && !s.reduceMotion);

  const game = useGame((s) => s.game);
  const busy = useGame((s) => s.busy);
  const selected = useGame((s) => s.selected);
  const boosterMode = useGame((s) => s.boosterMode);
  const paused = useGame((s) => s.paused);
  const hint = useGame((s) => s.hint);
  const cascade = useGame((s) => s.cascade);
  const burst = useGame((s) => s.burst);
  const used = useGame((s) => s.used);
  const message = useGame((s) => s.message);

  const [phase, setPhase] = useState<Phase>('checking');
  const [errorKey, setErrorKey] = useState<TranslationKey>('play.error');
  const started = useRef(false);
  const finishing = useRef(false);

  const difficulty: Difficulty = progress?.difficulty ?? 'novato';

  const beginLevel = async () => {
    if (!level) return;
    setPhase('starting');
    try {
      await api('/api/play/start', { method: 'POST', body: { levelId, difficulty } });
      const effective = applyDifficulty(level, difficulty);
      useGame.getState().init(levelId, difficulty, createGame(effective, newSeed()));
      finishing.current = false;
      setPhase('playing');
      void useSession.getState().refresh();
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : '';
      if (code === 'no_lives') setPhase('nolives');
      else if (code === 'premium_required') router.replace('/shop');
      else if (code === 'level_locked') router.replace('/levels');
      else {
        setErrorKey(code === 'difficulty_premium_required' ? 'difficulty.proPremium' : 'play.error');
        setPhase('error');
      }
    }
  };

  // Arranque: historia (solo al empezar una estación) y luego inicio del nivel. Una sola vez.
  useEffect(() => {
    if (!ready || !level || started.current) return;
    started.current = true;
    const chapter = level.index === 1 ? CHAPTERS.find((c) => c.season === level.season) : undefined;
    if (chapter && !chapterSeen(level.season)) {
      setPhase('story');
      return;
    }
    void beginLevel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Reloj de Pro: descuenta un segundo cada vez, sin contar pausas ni animaciones.
  useEffect(() => {
    const id = setInterval(() => useGame.getState().tickSecond(), 1000);
    return () => clearInterval(id);
  }, []);

  // Novato: pista automática tras un rato sin mover.
  useEffect(() => {
    if (!game || difficulty !== 'novato' || game.status !== 'playing' || busy || paused) return;
    const id = setTimeout(() => {
      const current = useGame.getState().game;
      if (current) useGame.getState().setHint(getHint(current));
    }, IDLE_HINT_MS);
    return () => clearTimeout(id);
  }, [game, difficulty, busy, paused]);

  // Fin de partida: guarda el resultado en el servidor y pasa a la pantalla de resultados.
  useEffect(() => {
    if (!game || game.status === 'playing' || finishing.current || !progress || !level) return;
    finishing.current = true;
    setPhase('finishing');
    void finishGame(game);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.status]);

  async function finishGame(g: GameState) {
    const usedNow = useGame.getState().used;
    const stageBefore = useSession.getState().progress?.bonsai.stage ?? 'semilla';
    try {
      const res = await api<FinishResponse>('/api/play/finish', {
        method: 'POST',
        body: {
          levelId,
          difficulty,
          won: g.status === 'won',
          score: g.score,
          matches: g.matches,
          prunes: g.pruned,
          seeds: g.collected.seed,
          maxCascade: g.maxCascade,
          boosters: usedNow,
        },
      });
      useSession.getState().setProgress(res.progress);
      if (res.newAchievements.length > 0) sfx.achievement();
      useGame.getState().setLastResult({
        levelId,
        difficulty,
        won: g.status === 'won',
        score: g.score,
        stars: res.stars,
        coinsEarned: res.coinsEarned,
        newAchievements: res.newAchievements,
        chapterCompleted: res.chapterCompleted,
        ending: res.ending,
        stageBefore,
        stageAfter: res.progress.bonsai.stage,
        style: res.progress.bonsai.style,
        seed: res.progress.bonsai.seed,
      });
      const delay = g.status === 'won' ? 1400 : 600;
      setTimeout(() => router.push(`/results/${levelId}`), animations ? delay : 200);
    } catch {
      setErrorKey('common.error');
      setPhase('error');
    }
  }

  if (!level) {
    return <Notice tone="error">{t('errors.notFound')}</Notice>;
  }

  const onTap = (p: { row: number; col: number }) => {
    const st = useGame.getState();
    if (st.boosterMode === 'scissors') {
      void st.applyBooster('scissors', p);
      return;
    }
    if (st.selected && st.selected.row === p.row && st.selected.col === p.col) {
      st.select(null);
      return;
    }
    if (st.selected && Math.abs(st.selected.row - p.row) + Math.abs(st.selected.col - p.col) === 1) {
      void st.swap(st.selected, p);
      return;
    }
    st.select(p);
  };

  const onSwipe = (a: { row: number; col: number }, b: { row: number; col: number }) => {
    void useGame.getState().swap(a, b);
  };

  const remaining = (b: Booster) => (progress ? Math.max(0, progress.boosters[b] - used[b]) : 0);

  const useBoosterButton = (b: Booster) => {
    if (remaining(b) <= 0 || busy || !game || game.status !== 'playing') {
      useGame.getState().setMessage('play.boosterOut');
      return;
    }
    if (b === 'scissors') {
      useGame.getState().setBoosterMode(boosterMode === 'scissors' ? null : 'scissors');
      return;
    }
    void useGame.getState().applyBooster(b);
  };

  return (
    <>
      {phase === 'story' && (
        <StoryDialog
          title={t('play.chapter')}
          lines={CHAPTERS.find((c) => c.season === level.season)?.intro ?? []}
          onDone={() => {
            markChapterSeen(level.season);
            void beginLevel();
          }}
        />
      )}

      <header className="sticky top-0 z-30 flex items-center gap-3 bg-[color:var(--bg)]/90 px-4 py-3 backdrop-blur">
        <Link href="/levels" className="btn btn-ghost btn-icon" aria-label={t('play.quit')}>
          ←
        </Link>
        <h1 className="font-display text-2xl font-bold">{t('levels.level', { n: levelId })}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Chip tone={difficulty === 'pro' ? 'sakura' : 'moss'}>{t(difficulty === 'pro' ? 'difficulty.pro' : 'difficulty.novato')}</Chip>
          {game && game.status === 'playing' && difficulty === 'novato' && (
            <button
              type="button"
              className="btn btn-sun btn-icon"
              onClick={() => useGame.getState().setHint(getHint(game))}
              disabled={busy}
              aria-label={t('play.hint')}
              title={t('play.hint')}
            >
              💡
            </button>
          )}
          {game && game.status === 'playing' && (
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => useGame.getState().setPaused(true)} aria-label={t('play.pause')}>
              ⏸
            </button>
          )}
        </div>
      </header>

      {phase === 'checking' || phase === 'starting' || phase === 'story' || !ready ? (
        <Loading labelKey="play.loading" />
      ) : phase === 'nolives' ? (
        <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-10">
          <Notice tone="error">{t('play.noLives')}</Notice>
          <Link href="/menu" className="btn btn-sky">{t('play.toMenu')}</Link>
          <Link href="/shop" className="btn btn-sakura">{t('shop.buy')}</Link>
        </main>
      ) : phase === 'error' ? (
        <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-10">
          <Notice tone="error">{t(errorKey)}</Notice>
          <button type="button" className="btn btn-moss" onClick={() => { started.current = false; setPhase('checking'); void beginLevel(); }}>
            {t('common.retry')}
          </button>
          <Link href="/levels" className="btn btn-ghost">{t('play.toMenu')}</Link>
        </main>
      ) : game ? (
        <main className="mx-auto flex max-w-lg flex-col gap-4 px-3 pb-10">
          {/* Marcadores: puntos, movimientos o tiempo */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label={t('play.score')} value={game.score} />
            <Stat label={t('play.moves')} value={game.movesLeft === null ? '∞' : game.movesLeft} />
            <Stat label={t('play.time')} value={game.timeLeft === null ? '∞' : formatSeconds(game.timeLeft)} />
          </div>

          {/* Objetivos */}
          <section aria-label={t('play.objectives')} className="card flex flex-col gap-2 p-3">
            {goalsProgress(game).map((gp, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span>{goalText(gp.goal, t)}</span>
                  <span>{gp.current}/{gp.target}{gp.done ? ' ✓' : ''}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-black/10" role="progressbar" aria-valuemin={0} aria-valuemax={gp.target} aria-valuenow={gp.current}>
                  <motion.div className={`h-full rounded-full ${gp.done ? 'bg-moss' : 'bg-sky'}`} animate={{ width: `${(gp.current / gp.target) * 100}%` }} transition={{ duration: 0.4 }} />
                </div>
              </div>
            ))}
          </section>

          {/* Estado del bonsái: salud (Pro) y clima */}
          <div className="flex items-center gap-3">
            <div className="w-28 shrink-0">
              <BonsaiView stage={progress?.bonsai.stage as 'semilla'} style={(progress?.bonsai.style ?? 'japones') as 'japones'} seed={progress?.bonsai.seed ?? 1} season={level.season} animate={animations} className="h-28 w-28" />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {game.health !== null && (
                <div>
                  <p className="text-sm font-bold">{t('play.bonsaiHealth')}: {game.health}%</p>
                  <div className="h-3 overflow-hidden rounded-full bg-black/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={game.health}>
                    <motion.div className={`h-full rounded-full ${game.health < 30 ? 'bg-sakura-deep' : 'bg-moss'}`} animate={{ width: `${game.health}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </div>
              )}
              {game.level.weatherEnabled && <Chip tone="sky">{t('play.weather')}: {t(`weather.${game.weather}` as TranslationKey)}</Chip>}
              {game.fertilizerArmed && <Chip tone="sun">{t('play.armed')} 🧪</Chip>}
            </div>
          </div>

          {/* Tablero */}
          <div className="relative">
            <Board
              game={game}
              selected={selected}
              hint={hint}
              burst={burst}
              disabled={busy || paused || game.status !== 'playing'}
              onTap={onTap}
              onSwipe={onSwipe}
            />
            <AnimatePresence>
              {cascade && (
                <motion.p
                  key={cascade.key}
                  initial={{ opacity: 0, scale: 0.6, y: 10 }}
                  animate={{ opacity: 1, scale: 1.1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 rounded-full bg-sun px-4 py-2 font-display text-2xl font-bold text-ink shadow-lg"
                  role="status"
                  onAnimationComplete={() => useGame.setState({ cascade: null })}
                >
                  {t('play.cascade', { n: cascade.n })}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Boosters */}
          <section aria-label={t('play.boosters')} className="grid grid-cols-3 gap-2">
            {BOOSTERS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => useBoosterButton(b)}
                aria-pressed={boosterMode === b}
                disabled={remaining(b) <= 0 || busy || game.status !== 'playing'}
                className={`card flex flex-col items-center gap-1 p-3 text-sm font-bold transition ${boosterMode === b ? 'ring-4 ring-sun' : ''}`}
              >
                <span className="text-2xl" aria-hidden>{BOOSTER_ICON[b]}</span>
                <span>{t(BOOSTER_LABEL[b])}</span>
                <span className="text-xs text-[color:var(--muted)]">{t('play.inventory', { n: remaining(b) })}</span>
              </button>
            ))}
          </section>

          {boosterMode === 'scissors' && (
            <p className="text-center font-bold">
              {t('play.scissorsHint')}{' '}
              <button type="button" className="underline" onClick={() => useGame.getState().setBoosterMode(null)}>{t('play.cancelBooster')}</button>
            </p>
          )}

          {hint && difficulty === 'novato' && game.status === 'playing' && <p className="text-center text-sm font-bold" role="status">{t('play.hintDone')} ✨</p>}
          {message && (
            <button type="button" className="text-center text-sm font-bold underline" onClick={() => useGame.getState().setMessage(null)}>
              {t(message)}
            </button>
          )}
          {phase === 'finishing' && <Notice tone="success">{t('play.calculating')}</Notice>}
          {game.status === 'won' && <Notice tone="success">{t('play.levelDone')}</Notice>}
        </main>
      ) : (
        <Loading />
      )}

      {/* Pausa */}
      {paused && game && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal="true" aria-label={t('play.pause')}>
          <div className="card flex w-full max-w-xs flex-col gap-3 p-6 text-center">
            <p className="font-display text-2xl font-bold">{t('play.pause')}</p>
            <button type="button" className="btn btn-moss" onClick={() => useGame.getState().setPaused(false)}>{t('play.resume')}</button>
            <Link href="/levels" className="btn btn-ghost" onClick={() => useGame.getState().reset()}>{t('play.quit')}</Link>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-2">
      <p className="text-xs font-bold uppercase text-[color:var(--muted)]">{label}</p>
      <p className="font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function formatSeconds(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function goalText(goal: ReturnType<typeof goalsProgress>[number]['goal'], t: (k: TranslationKey, v?: Record<string, string | number>) => string): string {
  switch (goal.type) {
    case 'collect':
      return t('goal.collect', { count: goal.count, piece: t(`piece.${goal.piece}` as TranslationKey) });
    case 'score':
      return t('goal.score', { count: goal.count });
    case 'prune':
      return t('goal.prune', { count: goal.count });
    case 'cascade':
      return t('goal.cascade', { count: goal.count });
  }
}
