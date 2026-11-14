import { expect, test, type Page } from '@playwright/test';

/** Centro de una celda del tablero, en coordenadas de la página. */
async function cellCenter(page: Page, row: number, col: number) {
  const box = await page.locator(`[role="gridcell"][data-row="${row}"][data-col="${col}"]`).boundingBox();
  if (!box) throw new Error(`Celda ${row},${col} no visible`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Arrastra una pieza hacia una celda adyacente (gesto real de deslizamiento). */
async function swipe(page: Page, from: { row: number; col: number }, to: { row: number; col: number }) {
  const a = await cellCenter(page, from.row, from.col);
  const b = await cellCenter(page, to.row, to.col);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}

test('flujo completo: entrada como invitado, mapa, historia, partida con pista y resultados', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Portada → menú: sin login, la app crea una cuenta de invitado.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bonsái Zen' })).toBeVisible();
  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page).toHaveURL(/\/menu$/);
  await expect(page.getByRole('heading', { name: 'Tu jardín' })).toBeVisible();

  // Mapa de niveles → nivel 1.
  await page.getByRole('link', { name: 'Jugar' }).click();
  await expect(page).toHaveURL(/\/levels$/);
  await page.getByRole('link', { name: 'Nivel 1' }).click();
  await expect(page).toHaveURL(/\/play\/1$/);

  // Historia de la primavera: se avanza hasta cerrar el diálogo.
  const story = page.getByRole('dialog');
  await expect(story).toBeVisible();
  for (let i = 0; i < 5 && (await story.count()) > 0; i++) {
    await story.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForTimeout(150);
  }
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Tablero listo: 64 fichas.
  await expect(page.locator('[role="gridcell"]')).toHaveCount(64);

  // Juega con pistas hasta completar el nivel (el botón de pista desaparece al terminar la partida).
  for (let turn = 0; turn < 60; turn++) {
    if (/\/results\//.test(page.url())) break;
    const hintButton = page.getByRole('button', { name: 'Pista' });
    if ((await hintButton.count()) === 0) break;
    await hintButton.click({ timeout: 4000 }).catch(() => undefined);
    const hinted = page.locator('[data-hint="true"]');
    if ((await hinted.count()) !== 2) continue;
    const [first, second] = await hinted.all();
    const from = { row: Number(await first.getAttribute('data-row')), col: Number(await first.getAttribute('data-col')) };
    const to = { row: Number(await second.getAttribute('data-row')), col: Number(await second.getAttribute('data-col')) };
    await swipe(page, from, to);
    // Espera a que termine la animación de la jugada antes de la siguiente.
    await page.waitForTimeout(700);
  }

  await expect(page).toHaveURL(/\/results\/1$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Resultados' })).toBeVisible();
  await expect(page.getByText(/Puntuación/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Volver al mapa' })).toBeVisible();

  // Sin errores en consola durante el flujo.
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});

test('modo Pro muestra salud del bonsái, clima y reloj durante la partida', async ({ page }) => {
  await page.goto('/menu');
  await expect(page.getByRole('heading', { name: 'Tu jardín' })).toBeVisible();

  // Elige Pro en la pantalla de dificultad.
  await page.goto('/difficulty');
  await page.getByRole('radio', { name: /Pro/ }).click();
  await page.getByRole('button', { name: 'Elegir y seguir' }).click();
  await expect(page).toHaveURL(/\/levels$/);

  await page.goto('/play/1');
  // La historia de la primavera se muestra al entrar por primera vez.
  const story = page.getByRole('dialog');
  await expect(story).toBeVisible();
  for (let i = 0; i < 5 && (await story.count()) > 0; i++) {
    await story.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForTimeout(150);
  }
  await expect(page.locator('[role="gridcell"]')).toHaveCount(64);
  await expect(page.getByText(/Salud: \d+%/)).toBeVisible();
  await expect(page.getByText(/Clima:/)).toBeVisible();
  await expect(page.getByText(/^\d+:\d{2}$/).first()).toBeVisible();
});
