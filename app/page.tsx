'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Activity, ArrowRight, BarChart3, Bell, Check, ChevronDown, Clock3, Database, Download, Dumbbell,
  Flame, History, House, Menu, Moon, Palette, Play, Plus, Search, Settings, Sun, Target,
  Trash2, TrendingUp, UserRound, X
} from 'lucide-react';

import { exercises, muscles, type Exercise, type Muscle } from './exercises';

type View = 'overview' | 'workouts' | 'history' | 'evolution' | 'settings';
type Log = { exercise: string; weight: number; reps: number; sets: number; date: string };
type AppNotification = { id: string; title: string; message: string; date: string; read: boolean };

const navItems = [
  { id: 'overview' as View, label: 'Visão geral', Icon: House },
  { id: 'workouts' as View, label: 'Meus treinos', Icon: Dumbbell },
  { id: 'history' as View, label: 'Histórico', Icon: History },
  { id: 'evolution' as View, label: 'Evolução', Icon: BarChart3 }
];

const demoVideo = 'https://videos.pexels.com/video-files/3195394/3195394-hd_1920_1080_25fps.mp4';

const crumbLabels: Record<View, string> = { overview: 'TREINO LIVRE', workouts: 'MEUS TREINOS', history: 'HISTÓRICO', evolution: 'EVOLUÇÃO', settings: 'CONFIGURAÇÕES' };
const isMachineExercise = (exercise: Exercise) => exercise.tag === 'Máquina' || Boolean(exercise.equipment) || /machine|smith|sled/.test(exercise.en.toLowerCase());

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [view, setView] = useState<View>('overview');
  const [selected, setSelected] = useState<Muscle>('Peito');
  const [active, setActive] = useState<Exercise | null>(null);
  const [videoExercise, setVideoExercise] = useState<Exercise | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [nativePermission, setNativePermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoggedIn(localStorage.getItem('atlas-session') === 'active');
    const stored = localStorage.getItem('atlas-logs');
    if (stored) setLogs(JSON.parse(stored));
    setDark(localStorage.getItem('atlas-theme') === 'dark');
    const storedNotifications = localStorage.getItem('atlas-notifications');
    if (storedNotifications) setNotifications(JSON.parse(storedNotifications));
    setNotificationsEnabled(localStorage.getItem('atlas-notifications-enabled') !== 'false');
    setNativePermission('Notification' in window ? Notification.permission : 'unsupported');
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) setNotificationsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotificationsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [notificationsOpen]);

  function toggleTheme() {
    setDark((value) => { const next = !value; localStorage.setItem('atlas-theme', next ? 'dark' : 'light'); return next; });
  }

  function saveLog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active) return;
    const data = new FormData(event.currentTarget);
    const log: Log = { exercise: active.name, weight: Number(data.get('weight')), reps: Number(data.get('reps')), sets: Number(data.get('sets')), date: new Date().toISOString() };
    const next = [log, ...logs]; setLogs(next); localStorage.setItem('atlas-logs', JSON.stringify(next));
    addNotification('Treino registrado', `${active.name} foi adicionado ao seu histórico.`);
    setActive(null); setToast('Treino registrado com sucesso'); setTimeout(() => setToast(''), 2800);
  }

  function addNotification(title: string, message: string) {
    if (!notificationsEnabled) return;
    const notification: AppNotification = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title, message, date: new Date().toISOString(), read: false };
    const next = [notification, ...notifications].slice(0, 30);
    setNotifications(next);
    localStorage.setItem('atlas-notifications', JSON.stringify(next));
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body: message }); } catch { /* Browser notification delivery is optional. */ }
    }
  }

  function markNotificationRead(id: string) {
    const next = notifications.map((notification) => notification.id === id ? { ...notification, read: true } : notification);
    setNotifications(next);
    localStorage.setItem('atlas-notifications', JSON.stringify(next));
    setNotificationsOpen(false);
    setView('history');
  }

  function markAllNotificationsRead() {
    const next = notifications.map((notification) => ({ ...notification, read: true }));
    setNotifications(next);
    localStorage.setItem('atlas-notifications', JSON.stringify(next));
  }

  function clearNotifications() {
    setNotifications([]);
    localStorage.removeItem('atlas-notifications');
  }

  function toggleNotifications() {
    setNotificationsEnabled((enabled) => {
      const next = !enabled;
      localStorage.setItem('atlas-notifications-enabled', String(next));
      return next;
    });
  }

  async function requestNativePermission() {
    if (!('Notification' in window)) {
      setNativePermission('unsupported');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNativePermission(permission);
    } catch {
      setNativePermission('unsupported');
    }
  }

  function clearLogs() {
    setLogs([]);
    localStorage.removeItem('atlas-logs');
  }

  const visible = exercises.filter((exercise) => exercise.muscle === selected && `${exercise.name} ${exercise.en}`.toLowerCase().includes(query.toLowerCase()));

  function navigate(nextView: View) {
    setView(nextView);
    setMobileNav(false);
  }

  if (!loggedIn) return <LoginScreen onLogin={() => { localStorage.setItem('atlas-session', 'active'); setLoggedIn(true); }} />;

  return <main className={dark ? 'app dark' : 'app'}>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Dumbbell size={19} /></span><span>atlas<span className="dot">.</span></span></div>
      <nav><NavList view={view} navigate={navigate} /></nav>
      <div className="sidebar-bottom"><button className={`settings-link ${view === 'settings' ? 'selected' : ''}`} onClick={() => navigate('settings')}><Settings size={18} /> Configurações</button><div className="mini-profile"><div className="avatar">AS</div><div><strong>Alex Silva</strong><small>Plano gratuito</small></div><ChevronDown size={15} /></div></div>
    </aside>
    {mobileNav && <div className="drawer-backdrop" onClick={() => setMobileNav(false)}><aside className="mobile-drawer" onClick={(event) => event.stopPropagation()}><div className="brand"><span className="brand-mark"><Dumbbell size={19} /></span><span>atlas<span className="dot">.</span></span></div><nav><NavList view={view} navigate={navigate} /></nav><button className={`settings-link ${view === 'settings' ? 'selected' : ''}`} onClick={() => navigate('settings')}><Settings size={18} /> Configurações</button></aside></div>}
    <section className="content">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Abrir menu"><Menu size={21} /></button>
        <div className="crumb">QUINTA, 24 DE OUTUBRO <span>/</span> {crumbLabels[view]}</div>
        <div className="actions"><button className="icon-button" onClick={toggleTheme} aria-label="Alternar tema">{dark ? <Sun size={19} /> : <Moon size={19} />}</button><div className="notification-anchor" ref={notificationsRef}><button className="icon-button notification" onClick={() => setNotificationsOpen((open) => !open)} aria-label={`Notificações${notifications.some((notification) => !notification.read) ? `: ${notifications.filter((notification) => !notification.read).length} não lidas` : ''}`} aria-expanded={notificationsOpen}><Bell size={19} />{notifications.some((notification) => !notification.read) && <span className="notification-count">{notifications.filter((notification) => !notification.read).length}</span>}</button>{notificationsOpen && <NotificationsPanel notifications={notifications} onRead={markNotificationRead} onReadAll={markAllNotificationsRead} onClear={clearNotifications} onClose={() => setNotificationsOpen(false)} />}</div><div className="avatar">AS</div></div>
      </header>
      <div className="main-scroll" id="top">
        {view === 'overview' && <Overview selected={selected} onSelect={setSelected} query={query} onQuery={setQuery} visible={visible} onVideo={setVideoExercise} onRegister={setActive} onSeeAll={() => navigate('workouts')} />}
        {view === 'workouts' && <WorkoutScreen logs={logs} onRegister={setActive} onVideo={setVideoExercise} />}
        {view === 'history' && <HistoryScreen logs={logs} />}
        {view === 'evolution' && <EvolutionScreen logs={logs} />}
        {view === 'settings' && <SettingsScreen dark={dark} onToggleTheme={toggleTheme} logs={logs} onClearLogs={clearLogs} notificationsEnabled={notificationsEnabled} onToggleNotifications={toggleNotifications} nativePermission={nativePermission} onRequestNativePermission={requestNativePermission} />}
      </div>
    </section>
    {active && <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setActive(null)}><div className="modal"><button className="close" onClick={() => setActive(null)}><X size={18} /></button><p className="eyebrow">REGISTRAR SÉRIE</p><h2>{active.name}</h2><p className="modal-sub">Sua última carga foi <strong>{active.last}</strong>. Como foi hoje?</p><form onSubmit={saveLog}><div className="form-row"><label>Carga (kg)<input name="weight" type="number" step="0.5" defaultValue={Number.parseInt(active.last) || 0} required /></label><label>Repetições<input name="reps" type="number" defaultValue={10} required /></label></div><label>Séries<input name="sets" type="number" defaultValue={active.sets} required /></label><button className="submit-button" type="submit">Salvar registro <Check size={17} /></button></form></div></div>}
    {videoExercise && <VideoModal exercise={videoExercise} onClose={() => setVideoExercise(null)} />}
    {toast && <div className="toast"><Check size={17} /> {toast}</div>}
  </main>;
}

function NavList({ view, navigate }: { view: View; navigate: (view: View) => void }) {
  return <>{navItems.map(({ id, label, Icon }) => <button key={id} className={view === id ? 'nav-active' : ''} onClick={() => navigate(id)}><Icon size={18} /> {label}</button>)}</>;
}

function NotificationsPanel({ notifications, onRead, onReadAll, onClear, onClose }: { notifications: AppNotification[]; onRead: (id: string) => void; onReadAll: () => void; onClear: () => void; onClose: () => void }) {
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  return <section className="notifications-panel" aria-label="Central de notificações">
    <header className="notifications-panel-header"><div><strong>Notificações</strong><small>{unreadCount ? `${unreadCount} não lida${unreadCount === 1 ? '' : 's'}` : 'Tudo em dia'}</small></div><button className="notifications-close" onClick={onClose} aria-label="Fechar notificações"><X size={17} /></button></header>
    {notifications.length ? <>
      <div className="notifications-list">{notifications.map((notification) => <button key={notification.id} className={`notification-item ${notification.read ? 'read' : 'unread'}`} onClick={() => onRead(notification.id)}><span className="notification-mark"><Dumbbell size={15} /></span><span className="notification-copy"><strong>{notification.title}</strong><small>{notification.message}</small><time dateTime={notification.date}>{new Date(notification.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time></span>{!notification.read && <i aria-label="Não lida" />}</button>)}</div>
      <footer className="notifications-panel-footer">{unreadCount > 0 && <button onClick={onReadAll}>Marcar todas como lidas</button>}<button onClick={onClear}>Limpar</button></footer>
    </> : <div className="notifications-empty"><span><Bell size={19} /></span><strong>Sem notificações por enquanto</strong><p>Quando você registrar um treino, o aviso aparecerá aqui.</p></div>}
  </section>;
}

function Overview({ selected, onSelect, query, onQuery, visible, onVideo, onRegister, onSeeAll }: { selected: Muscle; onSelect: (muscle: Muscle) => void; query: string; onQuery: (query: string) => void; visible: Exercise[]; onVideo: (exercise: Exercise) => void; onRegister: (exercise: Exercise) => void; onSeeAll: () => void }) {
  return <>
    <PageHeader eyebrow={<>BOM TE VER, ALEX <span>✦</span></>} title={<>Qual é o plano<br /><em>para hoje?</em></>} />
    <div className="stats"><div><span><Target size={16} /> VOLUME TOTAL</span><strong>3.240 <small>kg</small></strong><b className="positive">+8,4%</b></div><div><span><Activity size={16} /> TREINOS NO MÊS</span><strong>8 <small>/ 12</small></strong><b className="positive">+2 este mês</b></div><div><span><TrendingUp size={16} /> MELHOR MARCA</span><strong>72 <small>kg</small></strong><b className="neutral">Supino reto</b></div></div>
    <div className="section-heading"><div><p className="eyebrow">ESCOLHA POR GRUPO</p><h2>Comece seu treino</h2></div><button className="text-button" onClick={onSeeAll}>Ver todos <ArrowRight size={16} /></button></div>
    <div className="muscles">{muscles.map((muscle) => <button key={muscle.name} className={`muscle-card ${muscle.color} ${selected === muscle.name ? 'selected' : ''}`} onClick={() => onSelect(muscle.name)}><span className="muscle-icon">{muscle.icon}</span><strong>{muscle.name}</strong><small>{exercises.filter((e) => e.muscle === muscle.name).length} exercícios</small>{selected === muscle.name && <Check className="check" size={16} />}</button>)}</div>
    <div className="section-heading exercise-heading" id="exercise-section"><div><p className="eyebrow">{selected.toUpperCase()} · {visible.length} EXERCÍCIOS</p><h2>Seu treino de hoje</h2></div><label className="search"><Search size={17} /><input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Buscar exercício" /></label></div>
    <div className="exercise-grid">{visible.slice(0, 6).map((exercise) => <article className="exercise-card" key={exercise.id}><div className="exercise-image"><Image src={exercise.image} alt={exercise.name} fill sizes="(max-width: 700px) 100vw, 33vw" unoptimized={exercise.mediaType === 'gif'} /><span>{exercise.equipment ?? exercise.tag}</span><button className="play" onClick={() => onVideo(exercise)} aria-label={`Assistir vídeo de ${exercise.name}`}><Play size={14} fill="currentColor" /></button></div><div className="exercise-body"><div><h3>{exercise.name}</h3><p><Clock3 size={14} /> {exercise.sets} séries <i>·</i> {exercise.reps} reps</p></div><div className="last"><small>ÚLTIMA CARGA</small><strong>{exercise.last}</strong></div><button className="start-button" onClick={() => onRegister(exercise)}>Registrar treino <Plus size={17} /></button></div></article>)}</div>
    <div className="bottom-note"><span><UserRound size={18} /></span><p><strong>Treino livre não precisa ter dia.</strong> Escolha o grupo muscular e mantenha o foco no seu ritmo.</p></div>
  </>;
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('teste@atlas.app');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (email === 'teste@atlas.app' && password === '123456') return onLogin();
    setError('E-mail ou senha incorretos.');
  }

  return <main className="login-page"><div className="login-panel"><div className="login-brand"><span className="brand-mark"><Dumbbell size={19} /></span><span>atlas<span className="dot">.</span></span></div><div className="login-copy"><p className="eyebrow">SEU TREINO, SEU RITMO</p><h1>Volte para<br /><em>o seu foco.</em></h1><p>Entre para registrar suas cargas e acompanhar sua evolução.</p></div><form className="login-form" onSubmit={submit}><label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <p className="login-error">{error}</p>}<button className="submit-button" type="submit">Entrar <ArrowRight size={17} /></button></form><div className="test-credentials"><small>ACESSO TEMPORÁRIO PARA TESTES</small><strong>teste@atlas.app</strong><span>senha: 123456</span></div><p className="login-footer">Login com Google será disponibilizado em breve.</p></div><div className="login-art"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-card"><Flame size={24} /><strong>3 semanas</strong><span>de consistência</span></div><div className="art-word">MOVE<br /><i>WITH INTENT</i></div></div></main>;
}


function VideoModal({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const [video, setVideo] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setVideo(null);
    if (exercise.media) {
      setVideo(exercise.media);
      setStatus('ready');
      return () => { active = false; };
    }
    fetch(`/api/exercise-media?q=${encodeURIComponent(exercise.en)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('sem vídeo'))))
      .then((data: { videos?: string[] }) => {
        if (!active) return;
        if (data.videos?.[0]) { setVideo(data.videos[0]); setStatus('ready'); }
        else throw new Error('sem vídeo');
      })
      .catch(() => { if (active) { setVideo(demoVideo); setStatus('fallback'); } });
    return () => { active = false; };
  }, [exercise]);

  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="video-modal">
      <button className="close video-close" onClick={onClose} aria-label="Fechar vídeo"><X size={18} /></button>
      <div className="video-frame">
        {status === 'loading' ? <div className="video-loading"><span className="video-spinner" />Buscando vídeo do exercício...</div> : exercise.mediaType === 'gif' && status === 'ready' ? <img src={video ?? exercise.image} alt={`Demonstração de ${exercise.name}`} onError={() => { setVideo(demoVideo); setStatus('fallback'); }} /> : <video key={video ?? 'fallback'} controls autoPlay playsInline preload="metadata" poster={exercise.image} onError={() => { setVideo(demoVideo); setStatus('fallback'); }}><source src={video ?? demoVideo} type="video/mp4" />Seu navegador não conseguiu reproduzir este vídeo.</video>}
      </div>
      <div className="video-caption"><div><p className="eyebrow">DEMONSTRAÇÃO DO EXERCÍCIO</p><h2>{exercise.name}</h2><small>{exercise.equipment ?? exercise.muscle} · {exercise.source ?? 'MuscleWiki'}</small></div><span>{status === 'fallback' ? 'Demonstração genérica' : exercise.tag}</span></div>
      {exercise.instructions?.length ? <div className="video-instructions"><p className="eyebrow">COMO EXECUTAR</p><ol>{exercise.instructions.map((instruction, index) => <li key={`${exercise.id}-${index}`}>{instruction}</li>)}</ol></div> : null}
    </div>
  </div>;
}

function PageHeader({ eyebrow, title }: { eyebrow: React.ReactNode; title: React.ReactNode }) {
  return <div className="welcome"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><div className="streak"><div className="streak-icon"><Flame size={22} /></div><div><strong>3 semanas</strong><small>de consistência</small></div></div></div>;
}

function WorkoutScreen({ logs, onRegister, onVideo }: { logs: Log[]; onRegister: (exercise: Exercise) => void; onVideo: (exercise: Exercise) => void }) {
  const [filter, setFilter] = useState('');
  const [muscle, setMuscle] = useState<Muscle | 'Todos'>('Todos');
  const [equipment, setEquipment] = useState<'Todos' | 'Máquinas'>('Todos');
  const [limit, setLimit] = useState(40);
  useEffect(() => { setLimit(40); }, [filter, muscle, equipment]);
  const list = exercises.filter((exercise) => (muscle === 'Todos' || exercise.muscle === muscle) && (equipment === 'Todos' || isMachineExercise(exercise)) && `${exercise.name} ${exercise.en} ${exercise.muscle} ${exercise.equipment ?? ''}`.toLowerCase().includes(filter.toLowerCase()));
  const shown = list.slice(0, limit);
  const lastLoads = logs.reduce<Record<string, number>>((acc, log) => { if (acc[log.exercise] === undefined) acc[log.exercise] = log.weight; return acc; }, {});
  return <>
    <PageHeader eyebrow="SEUS EXERCÍCIOS" title={<>Monte seu treino<br /><em>sem dia fixo.</em></>} />
    <div className="section-heading"><div><p className="eyebrow">EXERCÍCIOS DISPONÍVEIS</p><h2>Escolha e registre</h2></div><span className="count-badge">{list.length} exercícios</span></div>
    <div className="workout-toolbar">
      <label className="search workout-search"><Search size={17} /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar exercício" /></label>
      <div className="workout-filter-groups"><div className="workout-chips">{(['Todos', ...muscles.map((item) => item.name)] as (Muscle | 'Todos')[]).map((item) => <button key={item} className={muscle === item ? 'active' : ''} onClick={() => setMuscle(item)}>{item}</button>)}</div><div className="workout-chips equipment-chips"><button className={equipment === 'Todos' ? 'active' : ''} onClick={() => setEquipment('Todos')}>Todos equipamentos</button><button className={equipment === 'Máquinas' ? 'active' : ''} onClick={() => setEquipment('Máquinas')}>Máquinas ({exercises.filter(isMachineExercise).length})</button></div></div>
    </div>
    <div className="unique-exercise-list">{shown.map((exercise) => <article key={exercise.id}><div className="unique-exercise-image"><Image src={exercise.image} alt={exercise.name} fill sizes="100px" unoptimized={exercise.mediaType === 'gif'} /></div><div className="exercise-info"><strong>{exercise.name}</strong><small>{exercise.muscle}{exercise.equipment ? ` · ${exercise.equipment}` : ''} · {exercise.sets} séries · {exercise.reps} reps</small></div><div className="exercise-load"><small>ÚLTIMA CARGA</small><strong>{lastLoads[exercise.name] !== undefined ? `${lastLoads[exercise.name]} kg` : exercise.last}</strong></div><div className="row-actions"><button className="mini-button" onClick={() => onVideo(exercise)} aria-label={`Vídeo de ${exercise.name}`}><Play size={14} /></button><button className="mini-button primary" onClick={() => onRegister(exercise)}><Plus size={14} /> Registrar</button></div></article>)}{list.length > limit && <button className="load-more" onClick={() => setLimit((value) => value + 40)}>Mostrar mais — {list.length - limit} restantes</button>}{list.length === 0 && <p className="empty-state">Nenhum exercício encontrado com esses filtros.</p>}</div>
  </>;
}

function HistoryScreen({ logs }: { logs: Log[] }) {
  return <>
    <PageHeader eyebrow="SEUS REGISTROS" title={<>Tudo o que você<br /><em>já conquistou.</em></>} />
    <div className="section-heading"><div><p className="eyebrow">ATIVIDADES</p><h2>Histórico de treinos</h2></div></div>
    <div className="history-screen"><div className="history-summary"><div><small>TREINOS REGISTRADOS</small><strong>{logs.length}</strong></div><div><small>ÚLTIMA ATIVIDADE</small><strong>{logs[0] ? new Date(logs[0].date).toLocaleDateString('pt-BR') : '--'}</strong></div><div><small>STATUS</small><strong className="status-good">Em evolução</strong></div></div>{logs.length === 0 ? <div className="empty-screen"><History size={28} /><h2>Seu histórico está vazio</h2><p>Registre seu primeiro exercício para começar a acompanhar sua jornada.</p></div> : <div className="history-table">{logs.map((log, index) => <div className="history-table-row" key={`${log.date}-${index}`}><div className="history-icon"><Dumbbell size={16} /></div><div><strong>{log.exercise}</strong><small>{new Date(log.date).toLocaleDateString('pt-BR')} · {log.sets} séries de {log.reps} repetições</small></div><b>{log.weight} kg</b></div>)}</div>}</div>
  </>;
}

function EvolutionScreen({ logs }: { logs: Log[] }) {
  const max = logs.length ? Math.max(...logs.map((log) => log.weight)) : 0;
  return <>
    <PageHeader eyebrow="SEU PROGRESSO" title={<>A evolução<br /><em>em números.</em></>} />
    <div className="section-heading"><div><p className="eyebrow">RESUMO</p><h2>Seu desempenho</h2></div></div>
    <div className="evolution-screen"><div className="evolution-hero"><div><small>CONSISTÊNCIA ATUAL</small><strong>3 semanas</strong><p>Você está mantendo uma ótima sequência.</p></div><Flame size={42} /></div><div className="evolution-metrics"><div><TrendingUp size={19} /><small>Volume total</small><strong>{logs.length ? `${logs.reduce((total, log) => total + log.weight * log.reps * log.sets, 0)} kg` : '0 kg'}</strong></div><div><Dumbbell size={19} /><small>Maior carga</small><strong>{max} kg</strong></div><div><Target size={19} /><small>Treinos feitos</small><strong>{logs.length}</strong></div></div><div className="progress-card"><div><h2>Progresso de carga</h2><small>Seus últimos registros</small></div><div className="fake-chart"><i style={{ height: '30%' }} /><i style={{ height: '44%' }} /><i style={{ height: '38%' }} /><i style={{ height: '65%' }} /><i style={{ height: '58%' }} /><i style={{ height: logs.length ? '82%' : '20%' }} /></div></div></div>
  </>;
}

function SettingsScreen({ dark, onToggleTheme, logs, onClearLogs, notificationsEnabled, onToggleNotifications, nativePermission, onRequestNativePermission }: { dark: boolean; onToggleTheme: () => void; logs: Log[]; onClearLogs: () => void; notificationsEnabled: boolean; onToggleNotifications: () => void; nativePermission: NotificationPermission | 'unsupported'; onRequestNativePermission: () => Promise<void> }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [notice, setNotice] = useState('');

  function exportData() {
    const backup = {
      app: 'Atlas Training',
      version: 1,
      exportedAt: new Date().toISOString(),
      theme: dark ? 'dark' : 'light',
      logs
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atlas-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Backup baixado para o seu dispositivo.');
  }

  function clearData() {
    onClearLogs();
    setConfirmClear(false);
    setNotice('Registros de treino removidos.');
  }

  return <>
    <PageHeader eyebrow="PREFERÊNCIAS DO APP" title={<>Configurações<br /><em>do seu espaço.</em></>} />
    <div className="settings-intro"><p>Personalize a experiência e gerencie os dados salvos neste dispositivo.</p></div>

    <section className="settings-section">
      <div className="settings-section-heading"><span className="settings-section-icon"><Palette size={18} /></span><div><h2>Aparência</h2><p>Escolha como o Atlas aparece para você.</p></div></div>
      <div className="settings-card appearance-card">
        <div><strong>Tema do aplicativo</strong><small>A preferência fica salva neste dispositivo.</small></div>
        <div className="theme-options" role="group" aria-label="Tema do aplicativo">
          <button className={!dark ? 'active' : ''} onClick={() => dark && onToggleTheme()} aria-pressed={!dark}><Sun size={16} /> Claro</button>
          <button className={dark ? 'active' : ''} onClick={() => !dark && onToggleTheme()} aria-pressed={dark}><Moon size={16} /> Escuro</button>
        </div>
      </div>
    </section>

    <section className="settings-section">
      <div className="settings-section-heading"><span className="settings-section-icon"><UserRound size={18} /></span><div><h2>Conta</h2><p>Informações do acesso atual.</p></div></div>
      <div className="settings-card account-card"><div className="avatar">AS</div><div className="account-details"><strong>Alex Silva</strong><small>teste@atlas.app</small></div><span className="account-badge">Plano gratuito</span></div>
    </section>

    <section className="settings-section">
      <div className="settings-section-heading"><span className="settings-section-icon"><Bell size={18} /></span><div><h2>Notificações</h2><p>Receba avisos quando registrar um treino.</p></div></div>
      <div className="settings-card notification-settings-card">
        <div className="notification-setting-row"><div><strong>Avisos dentro do Atlas</strong><small>Mostra novos avisos na central do sino.</small></div><button className={`preference-switch ${notificationsEnabled ? 'enabled' : ''}`} role="switch" aria-checked={notificationsEnabled} onClick={onToggleNotifications}><span /></button></div>
        <div className="notification-setting-row browser-notification-row"><div><strong>Notificações do navegador</strong><small>{nativePermission === 'granted' ? 'Permitidas neste navegador.' : nativePermission === 'denied' ? 'Bloqueadas nas permissões do navegador.' : nativePermission === 'unsupported' ? 'Este navegador não oferece notificações.' : 'Exibe avisos do sistema enquanto o Atlas estiver aberto.'}</small></div><button className="settings-action-button" onClick={onRequestNativePermission} disabled={!notificationsEnabled || nativePermission === 'granted' || nativePermission === 'denied' || nativePermission === 'unsupported'}>{nativePermission === 'granted' ? 'Ativadas' : nativePermission === 'denied' ? 'Bloqueadas' : nativePermission === 'unsupported' ? 'Indisponível' : 'Permitir'}</button></div>
      </div>
    </section>

    <section className="settings-section">
      <div className="settings-section-heading"><span className="settings-section-icon"><Database size={18} /></span><div><h2>Seus dados</h2><p>Seus registros ficam salvos localmente no navegador.</p></div></div>
      <div className="settings-card data-card">
        <div className="data-summary"><div><strong>{logs.length}</strong><small>registros de treino</small></div><p>Exporte uma cópia de segurança ou remova os registros salvos neste dispositivo.</p></div>
        <div className="settings-actions"><button className="settings-action-button" onClick={exportData}><Download size={16} /> Exportar meus dados</button>
          {!confirmClear ? <button className="settings-action-button danger" onClick={() => { setConfirmClear(true); setNotice(''); }}><Trash2 size={16} /> Apagar registros</button> : <div className="clear-confirm"><span>Apagar os {logs.length} registros de treino?</span><button className="confirm-delete" onClick={clearData}>Apagar</button><button className="cancel-delete" onClick={() => setConfirmClear(false)}>Cancelar</button></div>}
        </div>
      </div>
    </section>
    {notice && <p className="settings-notice" role="status"><Check size={16} /> {notice}</p>}
    <p className="settings-footnote">As configurações e os registros deste protótipo são armazenados neste navegador.</p>
  </>;
}
