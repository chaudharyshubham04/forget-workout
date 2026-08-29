import { h, icon, mount } from '../lib/dom.js';
import * as S from '../store.js';
import { lineChart } from '../lib/charts.js';
import { bodySeries } from '../lib/stats.js';
import { emptyState, sheet, toast, confirmDelete, segmented } from '../lib/ui.js';
import { fmtDate, relDay, todayKey, fmtNum, fmtWeight, fmtLength, cmToIn } from '../lib/utils.js';
import { putBlob, blobURL, delBlob } from '../lib/idb.js';
import { uid } from '../lib/utils.js';

export const title = 'Body';
export const actions = () => [
  h('button.iconbtn', { 'aria-label': 'Add entry', onclick: () => entrySheet(null) }, icon('plus')),
];

const MEASUREMENTS = [
  ['neck', 'Neck'], ['shoulders', 'Shoulders'], ['chest', 'Chest'], ['waist', 'Waist'],
  ['hips', 'Hips'], ['leftArm', 'Left arm'], ['rightArm', 'Right arm'],
  ['leftThigh', 'Left thigh'], ['rightThigh', 'Right thigh'], ['leftCalf', 'Left calf'], ['rightCalf', 'Right calf'],
];

export function render({ navigate, refresh }) {
  const st = S.get();
  const unit = st.settings.unit, lu = st.settings.lengthUnit;
  const entries = [...st.bodyEntries].sort((a, b) => (a.date < b.date ? 1 : -1));

  if (!entries.length) {
    return h('.stack.stack-16',
      emptyState({ iconName: 'scale', title: 'No body data yet',
        message: 'Log your weight, measurements and progress photos to see how your body changes alongside your training.',
        action: h('button.btn.btn-primary', { onclick: () => entrySheet(null, refresh) }, icon('plus'), 'Add first entry') }));
  }

  let metric = 'weight';
  const chartHost = h('div');
  const options = [['weight', 'Weight'], ['bodyFat', 'Body fat'],
    ...MEASUREMENTS.filter(([k]) => entries.some((e) => e.measurements?.[k]))];

  const draw = () => {
    let series;
    if (metric === 'weight' || metric === 'bodyFat') series = bodySeries(entries, metric);
    else series = entries.filter((e) => e.measurements?.[metric] != null)
      .map((e) => ({ date: e.date, value: Number(e.measurements[metric]) }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    if (metric === 'weight' && unit === 'lb') series = series.map((p) => ({ ...p, value: p.value / 0.45359237 }));
    if (metric !== 'weight' && metric !== 'bodyFat' && lu === 'in') series = series.map((p) => ({ ...p, value: cmToIn(p.value) }));

    const first = series[0]?.value, last = series[series.length - 1]?.value;
    mount(chartHost,
      series.length > 1
        ? h('.stack.stack-10',
            lineChart(series, { height: 200, fmt: (v) => fmtNum(v, 1), label: metric }),
            h('.grid.grid-3',
              cell('First', `${fmtNum(first, 1)}`),
              cell('Latest', `${fmtNum(last, 1)}`),
              cell('Change', `${last - first >= 0 ? '+' : ''}${fmtNum(last - first, 1)}`,
                last - first === 0 ? undefined : (metric === 'bodyFat' ? (last < first ? 'var(--good)' : 'var(--warn)') : undefined))))
        : h('.chart-empty', 'Log at least two entries to see a trend.'));
  };

  const bar = h('.seg', ...options.map(([id, label]) =>
    h(`button${metric === id ? '.on' : ''}`, { onclick: (e) => {
      metric = id; [...bar.children].forEach((c) => c.classList.remove('on'));
      e.currentTarget.classList.add('on'); draw();
    } }, label)));
  draw();

  const latest = entries[0];

  return h('.stack.stack-16',
    h('.card.card-pad.stack.stack-12',
      h('.row-between',
        h('div', h('.t-xs.dim', 'Latest entry'), h('h2', fmtDate(latest.date, 'med'))),
        h('button.btn.btn-sm', { onclick: () => entrySheet(null, refresh) }, icon('plus'), 'Log today')),
      h('.grid.grid-3',
        cell('Weight', latest.weight ? fmtWeight(latest.weight, unit) : '—'),
        cell('Body fat', latest.bodyFat ? `${fmtNum(latest.bodyFat, 1)}%` : '—'),
        cell('Entries', String(entries.length)))),

    h('.card.card-pad.stack.stack-12', bar, chartHost),

    h('h2', 'History'),
    ...entries.map((e) => h('.card.card-pad.card-hover', { onclick: () => entrySheet(e, refresh) },
      h('.row-between',
        h('.grow',
          h('div.sb', fmtDate(e.date, 'med')),
          h('.t-xs.dim', { style: { marginTop: '3px' } }, relDay(e.date)),
          h('.row.wrap', { style: { gap: '5px', marginTop: '8px' } },
            e.weight ? h('span.tag', fmtWeight(e.weight, unit)) : null,
            e.bodyFat ? h('span.tag', `${fmtNum(e.bodyFat, 1)}% BF`) : null,
            ...Object.entries(e.measurements || {}).filter(([, v]) => v)
              .slice(0, 4).map(([k, v]) => h('span.tag',
                `${MEASUREMENTS.find((m) => m[0] === k)?.[1] || k} ${fmtLength(Number(v), lu)}`)),
            e.photoId ? h('span.tag.tag-info', icon('camera', 10), 'Photo') : null),
          e.notes ? h('.t-xs.muted', { style: { marginTop: '6px', fontStyle: 'italic' } }, e.notes) : null),
        icon('chevronRight')))));
}

const cell = (label, value, color) => h('div', { style: { textAlign: 'center' } },
  h('div', { style: { fontWeight: 800, fontSize: '17px', fontFamily: 'var(--ff-num)', color } }, value),
  h('.t-xs.dim', { style: { marginTop: '2px' } }, label));

function entrySheet(existing, refresh) {
  const st = S.get();
  const unit = st.settings.unit, lu = st.settings.lengthUnit;
  const d = existing
    ? { ...existing, measurements: { ...(existing.measurements || {}) } }
    : { date: todayKey(), weight: null, bodyFat: null, measurements: {}, notes: '', photoId: null };

  const conv = (v) => (v == null ? '' : unit === 'lb' ? +(v / 0.45359237).toFixed(1) : v);
  const unconv = (v) => (unit === 'lb' ? v * 0.45359237 : v);
  const convL = (v) => (v == null || v === '' ? '' : lu === 'in' ? +cmToIn(v).toFixed(1) : v);
  const unconvL = (v) => (lu === 'in' ? v * 2.54 : v);

  const photoWrap = h('div');
  const drawPhoto = async () => {
    if (!d.photoId) {
      mount(photoWrap, h('button.btn.btn-block', { onclick: pickPhoto },
        icon('camera'), 'Add progress photo'));
      return;
    }
    const url = await blobURL(d.photoId);
    mount(photoWrap,
      url ? h('div', { style: { position: 'relative' } },
        h('img', { src: url, style: { width: '100%', borderRadius: 'var(--r-md)', display: 'block',
          maxHeight: '280px', objectFit: 'cover' } }),
        h('button.iconbtn', { style: { position: 'absolute', top: '8px', right: '8px',
          background: 'rgba(0,0,0,.55)', color: '#fff' }, 'aria-label': 'Remove photo',
          onclick: async () => { await delBlob(d.photoId); d.photoId = null; drawPhoto(); } }, icon('trash')))
        : h('button.btn.btn-block', { onclick: pickPhoto }, icon('camera'), 'Add progress photo'));
  };
  function pickPhoto() {
    const input = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 6 * 1024 * 1024) { toast('Image is over 6 MB — pick a smaller one', 'bad'); return; }
      const id = `photo_${uid('p')}`;
      const ok = await putBlob(id, file);
      if (ok === null && !(await blobURL(id))) { toast('Could not store the photo on this device', 'bad'); return; }
      d.photoId = id; drawPhoto();
    });
    document.body.appendChild(input); input.click();
    setTimeout(() => input.remove(), 1000);
  }
  drawPhoto();

  const ref = sheet({ title: existing ? 'Edit entry' : 'Log body data', body: h('.stack.stack-16',
    h('.field', h('label.label', 'Date'),
      h('input.input', { type: 'date', value: d.date, oninput: (e) => { d.date = e.target.value; } })),
    h('.grid.grid-2',
      h('.field', h('label.label', `Weight (${unit})`),
        h('input.input', { type: 'number', step: 'any', inputmode: 'decimal', value: conv(d.weight),
          oninput: (e) => { const v = parseFloat(e.target.value); d.weight = Number.isNaN(v) ? null : unconv(v); } })),
      h('.field', h('label.label', 'Body fat (%)'),
        h('input.input', { type: 'number', step: 'any', inputmode: 'decimal', value: d.bodyFat ?? '',
          oninput: (e) => { const v = parseFloat(e.target.value); d.bodyFat = Number.isNaN(v) ? null : v; } }))),
    h('.field', h('label.label', `Measurements (${lu})`),
      h('.grid.grid-2', ...MEASUREMENTS.map(([k, label]) =>
        h('.field', h('label.label', { style: { fontSize: '11px', color: 'var(--ink-3)' } }, label),
          h('input.input.input-inline', { type: 'number', step: 'any', inputmode: 'decimal',
            value: convL(d.measurements[k]),
            oninput: (e) => {
              const v = parseFloat(e.target.value);
              if (Number.isNaN(v)) delete d.measurements[k]; else d.measurements[k] = unconvL(v);
            } }))))),
    h('.field', h('label.label', 'Progress photo'), photoWrap,
      h('.t-xs.dim', 'Photos stay on this device and are never uploaded.')),
    h('.field', h('label.label', 'Notes'),
      h('textarea.textarea', { placeholder: 'How you look and feel, conditions, anything relevant',
        oninput: (e) => { d.notes = e.target.value; } }, d.notes || '')),
    existing ? h('button.btn.btn-danger.btn-block', { onclick: async () => {
      if (await confirmDelete('this entry')) {
        if (existing.photoId) await delBlob(existing.photoId);
        S.deleteBodyEntry(existing.id); ref.close(); refresh ? refresh() : (location.hash = '#/body');
      }
    } }, icon('trash'), 'Delete entry') : null),
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => {
      if (existing) S.updateBodyEntry(existing.id, d); else S.addBodyEntry(d);
      ref.close(); toast('Saved', 'good');
      refresh ? refresh() : (location.hash = '#/body');
    } }, 'Save entry') });
}
