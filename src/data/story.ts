/**
 * Guion de la historia. Para editarla basta con cambiar los textos de este archivo.
 *
 * Trama: el aprendiz hereda el bonsái de su abuelo, Haru, un maestro que desapareció
 * tras una tormenta. Cada estación es un capítulo. La guardiana Ume, misteriosa,
 * deja pistas entre niveles. El final depende de si el jugador completa el último
 * nivel de cada estación en modo Pro (ver `endingFor` en src/game/progression.ts).
 */
import type { Ending } from '@/game/progression';
import type { Season } from '@/game/types';

export type Speaker = 'ume' | 'aprendiz';

export interface Line {
  readonly speaker: Speaker;
  readonly text: { readonly es: string; readonly en: string };
}

export interface Chapter {
  readonly season: Season;
  readonly title: { readonly es: string; readonly en: string };
  /** Se muestra antes del primer nivel de la estación. */
  readonly intro: readonly Line[];
  /** Se muestra al completar el último nivel de la estación. */
  readonly outro: readonly Line[];
}

export const SPEAKER_NAMES: Record<Speaker, { es: string; en: string }> = {
  ume: { es: 'Ume', en: 'Ume' },
  aprendiz: { es: 'Tú', en: 'You' },
};

export const CHAPTERS: readonly Chapter[] = [
  {
    season: 'primavera',
    title: { es: 'Capítulo I — Primavera: la herencia', en: 'Chapter I — Spring: the inheritance' },
    intro: [
      {
        speaker: 'aprendiz',
        text: {
          es: 'El bonsái de mi abuelo sigue aquí, en el umbral, como si esperara. Desde la tormenta nadie lo ha regado.',
          en: 'My grandfather’s bonsai is still here on the threshold, as if it were waiting. Nobody has watered it since the storm.',
        },
      },
      {
        speaker: 'ume',
        text: {
          es: 'Haru no se fue. Se marchó a buscar la semilla que el viento se llevó. Cuídala, y ella te llevará hasta él.',
          en: 'Haru did not leave. He went looking for the seed the wind carried away. Tend this tree, and it will lead you to him.',
        },
      },
      {
        speaker: 'ume',
        text: {
          es: 'Empieza por lo sencillo: hojas, flores y agua. Lo demás vendrá con la práctica.',
          en: 'Start with the simple things: leaves, blossoms and water. The rest comes with practice.',
        },
      },
    ],
    outro: [
      {
        speaker: 'ume',
        text: {
          es: 'Las flores de cerezo han vuelto. Eso significa que el camino de Haru empieza a abrirse.',
          en: 'The cherry blossoms have returned. That means the path to Haru is starting to open.',
        },
      },
    ],
  },
  {
    season: 'verano',
    title: { es: 'Capítulo II — Verano: el calor del tronco', en: 'Chapter II — Summer: the warmth of the trunk' },
    intro: [
      {
        speaker: 'aprendiz',
        text: {
          es: 'Las hojas crecen más deprisa de lo que imaginaba. Las tijeras de la familia pesan, pero ya no tiemblo al usarlas.',
          en: 'The leaves grow faster than I expected. The family shears are heavy, but I no longer tremble when I use them.',
        },
      },
      {
        speaker: 'ume',
        text: {
          es: 'Podar no es destruir. Cada corte indica al árbol dónde quieres que nazca la fuerza.',
          en: 'Pruning is not destruction. Every cut shows the tree where you want its strength to grow.',
        },
      },
    ],
    outro: [
      {
        speaker: 'ume',
        text: {
          es: 'Haru dejó un mapa grabado en la corteza. Veo una montaña nevada al norte: ahí empieza el invierno.',
          en: 'Haru left a map carved into the bark. I see a snowy mountain to the north: that is where winter begins.',
        },
      },
    ],
  },
  {
    season: 'otono',
    title: { es: 'Capítulo III — Otoño: las hojas que caen', en: 'Chapter III — Autumn: the falling leaves' },
    intro: [
      {
        speaker: 'aprendiz',
        text: {
          es: 'Las hojas se vuelven rojas y el jardín huele a humedad. Algunas se caen antes de tiempo.',
          en: 'The leaves turn red and the garden smells of damp earth. Some fall before their time.',
        },
      },
      {
        speaker: 'ume',
        text: {
          es: 'El clima también es parte del trabajo. Aprende a leer el viento y la sequía, o el árbol te lo reprochará.',
          en: 'The weather is part of the work too. Learn to read the wind and the drought, or the tree will let you know.',
        },
      },
    ],
    outro: [
      {
        speaker: 'ume',
        text: {
          es: 'Ya casi no queda nada del camino que él dejó. Solo falta el frío, y con él, la verdad.',
          en: 'Little remains of the path he left. Only the cold is left, and with it, the truth.',
        },
      },
    ],
  },
  {
    season: 'invierno',
    title: { es: 'Capítulo IV — Invierno: la nieve sobre la rama', en: 'Chapter IV — Winter: snow on the branch' },
    intro: [
      {
        speaker: 'aprendiz',
        text: {
          es: 'La nieve cubre el bonsái y el silencio es total. Siento que alguien me observa desde el otro lado del jardín.',
          en: 'Snow covers the bonsai and the silence is complete. I feel someone watching me from the far side of the garden.',
        },
      },
      {
        speaker: 'ume',
        text: {
          es: 'Haru aprendió aquí la última lección: un bonsái perfecto no es el que nunca se marchita, sino el que se cuida hasta el final.',
          en: 'Haru learned the last lesson here: a perfect bonsai is not one that never withers, but one tended until the very end.',
        },
      },
    ],
    outro: [
      {
        speaker: 'ume',
        text: {
          es: 'Has llegado hasta el final de las estaciones. Ahora sabemos lo que se necesita para encontrarlo.',
          en: 'You have reached the end of the seasons. Now we know what it takes to find him.',
        },
      },
    ],
  },
];

export const ENDINGS: Record<Ending, { readonly title: { es: string; en: string }; readonly lines: readonly Line[] }> = {
  pro: {
    title: { es: 'Final: la semilla del maestro', en: 'Ending: the master’s seed' },
    lines: [
      {
        speaker: 'ume',
        text: {
          es: 'Completaste cada estación en el camino más exigente. Haru te está esperando en el pabellón del viento.',
          en: 'You completed every season on the hardest path. Haru is waiting for you in the windswept pavilion.',
        },
      },
      {
        speaker: 'aprendiz',
        text: {
          es: 'Lo encuentro. Está sentado junto a un bonsái nuevo, y sonríe como si nunca se hubiera ido.',
          en: 'I find him. He is sitting beside a new bonsai, smiling as if he had never left.',
        },
      },
      {
        speaker: 'ume',
        text: {
          es: 'Ahora el jardín es tuyo. Cuídalo bien.',
          en: 'Now the garden is yours. Take good care of it.',
        },
      },
    ],
  },
  standard: {
    title: { es: 'Final: el jardín en calma', en: 'Ending: the garden at rest' },
    lines: [
      {
        speaker: 'ume',
        text: {
          es: 'Cuidaste el bonsái con paciencia, aunque no siempre por el camino más difícil. Eso también es un tipo de maestría.',
          en: 'You tended the bonsai with patience, though not always by the hardest road. That is a kind of mastery too.',
        },
      },
      {
        speaker: 'aprendiz',
        text: {
          es: 'Encontré una nota de Haru bajo la maceta: “Volveré cuando la nieve se derrita”. Esperaré junto al árbol.',
          en: 'I found a note from Haru under the pot: “I will return when the snow melts.” I will wait beside the tree.',
        },
      },
    ],
  },
};
