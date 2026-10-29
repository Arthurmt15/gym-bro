import { NextResponse } from 'next/server';

export const revalidate = 86400;

type MuscleWikiExercise = {
  exercise_name?: string;
  videoURL?: string[];
  youtubeURL?: string;
  steps?: string[];
  target?: Record<string, string[]>;
};

const UPSTREAM = 'https://workoutapi.vercel.app/exercises';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Informe o parâmetro q.' }, { status: 400 });
  }

  try {
    const response = await fetch(`${UPSTREAM}?name=${encodeURIComponent(query)}`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Falha ao consultar a API de exercícios.' }, { status: 502 });
    }

    const data = (await response.json()) as MuscleWikiExercise[];
    const items = Array.isArray(data) ? data : [];
    const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    const score = (item: MuscleWikiExercise) => {
      const name = normalize(item.exercise_name ?? '');
      let total = tokens.filter((token) => name.includes(token)).length * 10;
      if (name === normalize(query)) total += 50;
      else if (name.startsWith(normalize(query))) total += 25;
      if (['dumbbell', 'barbell', 'machine', 'cable'].some((equipment) => name.startsWith(equipment))) total += 12;
      return total - Math.abs(name.length - query.length) * 0.05;
    };
    const candidates = items.filter((item) => (item.videoURL?.length ?? 0) > 0).sort((a, b) => score(b) - score(a));
    const best = candidates[0];

    if (!best) {
      return NextResponse.json({ error: 'Nenhum vídeo encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      name: best.exercise_name ?? query,
      videos: (best.videoURL ?? []).map((url) => url.split('#')[0]),
      youtube: best.youtubeURL ?? null,
      steps: best.steps ?? [],
      target: best.target ?? null
    });
  } catch {
    return NextResponse.json({ error: 'Serviço de vídeos indisponível no momento.' }, { status: 502 });
  }
}
