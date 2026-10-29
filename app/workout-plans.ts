import type { Muscle } from './exercises';

// Ordered exercise IDs form the ready-to-follow routine for each muscle group.
export const workoutPlans: Record<Muscle, string[]> = {
  Peito: [
    'barbell-bench-press',
    'exdb-DOoWcnA',
    'barbell-incline-bench-press',
    'dumbbell-bench-press',
    'cable-chest-press',
    'dumbbell-chest-fly',
    'cable-pec-fly'
  ],
  Costas: [
    'machine-pulldown',
    'barbell-bent-over-row',
    'machine-seated-cable-row',
    'dumbbell-single-arm-row',
    'pull-ups',
    'cable-pullover'
  ],
  Pernas: [
    'barbell-squat',
    'machine-leg-press',
    'barbell-romanian-deadlift',
    'machine-leg-extension',
    'exdb-17lJ1kr',
    'machine-hamstring-curl',
    'barbell-hip-thrust',
    'machine-standing-calf-raises'
  ],
  Ombros: [
    'dumbbell-overhead-press',
    'dumbbell-seated-arnold-press',
    'dumbbell-lateral-raise',
    'cable-rear-delt-fly',
    'cable-lateral-raise',
    'machine-face-pulls'
  ],
  Braços: [
    'barbell-curl',
    'dumbbell-curl',
    'dumbbell-hammer-curl',
    'barbell-close-grip-bench-press',
    'machine-cable-v-bar-push-downs',
    'dumbbell-seated-overhead-tricep-extension'
  ],
  'Abdômen': [
    'cable-standing-crunch',
    'hanging-knee-raises',
    'forearm-plank',
    'cable-pallof-press',
    'cable-wood-chopper',
    'machine-roll-outs'
  ]
};
