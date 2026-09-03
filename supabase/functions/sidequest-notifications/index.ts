import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY = 'BHG0LCpF_28EhXT_fmjBTqbmUF7fD4AEljkarRhSeHLHYZaK05Y1TqSIfkjTJvMLCZlg4fDSrYaHcR9EecksmtQ';
const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
if (!privateKey) throw new Error('VAPID_PRIVATE_KEY is missing');
webpush.setVapidDetails('https://jjermyn530-bot.github.io/sidequest/', VAPID_PUBLIC_KEY, privateKey);

const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
const adminKey = secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, adminKey!, { auth: { persistSession: false } });

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const londonParts = (date = new Date()) => Object.fromEntries(
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value])
);
const isoDate = (parts: Record<string, string>) => `${parts.year}-${parts.month}-${parts.day}`;
const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10);
};
const schoolWeek = (date: string, anchor: string) => {
  const weeks = Math.floor((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${anchor}T12:00:00Z`)) / 604800000);
  return Math.abs(weeks) % 2 === 0 ? 'A' : 'B';
};
const lessonText = (line: string) => {
  const match = line.match(/^(\d{2}:\d{2})\s+(.+?)(?:\s+·\s+(.+))?$/);
  return match ? `${match[1]} ${match[2]} (${match[3] ?? 'room TBC'})` : line;
};

Deno.serve(async () => {
  const now = londonParts();
  const today = isoDate(now);
  const time = `${now.hour}:${now.minute}`;
  const tomorrow = addDays(today, 1);
  const [{ data: settings }, { data: subscriptions }, { data: tasks }] = await Promise.all([
    supabase.from('sidequest_settings').select('user_id,payload'),
    supabase.from('sidequest_push_subscriptions').select('id,user_id,endpoint,p256dh,auth'),
    supabase.from('sidequest_tasks').select('user_id,payload,deleted')
  ]);
  let sent = 0;

  for (const setting of settings ?? []) {
    const prefs = setting.payload?.notificationPrefs ?? {};
    const userTasks = (tasks ?? []).filter(row => row.user_id === setting.user_id && !row.deleted && !row.payload?.completed).map(row => row.payload);
    const notices: Array<{ key: string; title: string; body: string; tag: string }> = [];

    if (prefs.morningEnabled !== false && time === (prefs.morningTime ?? '07:00')) {
      const week = schoolWeek(today, setting.payload?.weekAnchor ?? '2026-08-31');
      const lessons = setting.payload?.timetable?.[week]?.[now.weekday] ?? [];
      const due = userTasks.filter(task => task.due === today).map(task => task.title);
      if (lessons.length || due.length) notices.push({ key: `morning:${today}`, title: `${now.weekday} · Week ${week}`, body: [lessons.map(lessonText).join(' • '), due.length ? `Due today: ${due.join(', ')}` : ''].filter(Boolean).join('\n'), tag: 'sidequest-morning' });
    }
    if (prefs.eveningEnabled !== false && time === (prefs.eveningTime ?? '19:00')) {
      const due = userTasks.filter(task => task.due === tomorrow).map(task => task.title);
      if (due.length) notices.push({ key: `tomorrow:${today}`, title: 'Due tomorrow', body: due.join(' • '), tag: 'sidequest-deadlines' });
    }
    if (now.weekday === dayNames[0] && prefs.sparxEnabled !== false && time === (prefs.sparxTime ?? '18:00')) {
      const unfinished = (setting.payload?.progress ?? []).filter((item: { value: number }) => item.value < 100).map((item: { name: string; value: number }) => `${item.name} ${item.value}%`);
      if (unfinished.length) notices.push({ key: `sparx:${today}`, title: 'Weekly Sparx check', body: unfinished.join(' • '), tag: 'sidequest-sparx' });
    }

    for (const notice of notices) {
      const { error: claimed } = await supabase.from('sidequest_notification_log').insert({ user_id: setting.user_id, notification_key: notice.key });
      if (claimed) continue;
      for (const device of (subscriptions ?? []).filter(row => row.user_id === setting.user_id)) {
        try {
          await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify({ ...notice, url: './' }));
          sent++;
        } catch (error) {
          const status = Number((error as { statusCode?: number }).statusCode);
          if (status === 404 || status === 410) await supabase.from('sidequest_push_subscriptions').delete().eq('id', device.id);
          console.error('Push failed', status || error);
        }
      }
    }
  }
  return Response.json({ ok: true, sent, checkedAt: `${today} ${time}` });
});
