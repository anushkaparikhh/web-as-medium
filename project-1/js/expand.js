const $ = id => document.getElementById(id);
const stage = $('stage');
const PLAY  = '<svg viewBox="0 0 12 12"><path d="M2 1l9 5-9 5z"/></svg>';
const PAUSE = '<svg viewBox="0 0 12 12"><path d="M2 1h3v10H2zM7 1h3v10H7z"/></svg>';

let active = -1, hover = -1, playing = -1, audio = null, settle = null;

/*particles from the center */
const PARTICLE = {inner:0.03, outer:0.46, curve:1};

/* bands */
const bands = [...stage.children];
const SOUNDS = bands.map(b => ({
  title: b.dataset.title, dur: b.dataset.dur, views: b.dataset.views, source: b.dataset.source,
  audio: b.dataset.audio || '', 
  particles: JSON.parse(b.dataset.particles || '[]')
}));

bands.forEach((b, i) => {
  const s = SOUNDS[i], p = b.querySelector('p');
  b.tabIndex = 0;
  b.setAttribute('role', 'button');
  b.setAttribute('aria-label', s.title);
  b.insertAdjacentHTML('afterbegin', '<canvas></canvas>');
  const inner = document.createElement('div');
  inner.className = 'inner';
  inner.appendChild(p);
  inner.insertAdjacentHTML('beforeend', '<button class="play" aria-label="Play sound">' + PLAY + '</button>');
  b.appendChild(inner);

  b.addEventListener('click', () => { if (active !== i) open(i); });
  b.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === b) { e.preventDefault(); open(i); } });
  b.addEventListener('mouseenter', () => { hover = i; info(); });
  b.addEventListener('mouseleave', e => {
    hover = -1;
    // leaving the open band onto another band collapses it
    if (active === i) collapse();
    else info();
  });
  b.addEventListener('focus', () => { hover = i; info(); });
  b.addEventListener('blur',  () => { hover = -1; info(); });
  b.querySelector('.play').addEventListener('click', e => { e.stopPropagation(); toggle(i); });
});

/* metadata */
function info() {
  const i = active >= 0 ? active : hover, s = SOUNDS[i];
  $('meta').classList.toggle('on', !!s);
  $('title').classList.toggle('on', !!s);
  if (s) {
    $('views').textContent = s.views;
    $('source').textContent = s.source;
    $('ttl').textContent = s.title;
    $('dur').textContent = s.dur;
  }
}

/* open + close */
function open(i) {
  active = i;
  stage.classList.add('open');
  document.body.classList.add('open');
  bands.forEach((b, j) => {
    b.classList.toggle('active', j === i);
    b.classList.toggle('edge', j !== i);
    b.title = j !== i ? SOUNDS[j].title : '';
    b.classList.remove('settled');
    b.querySelector('canvas').width = 0;
  });
  document.body.style.setProperty('--ink', getComputedStyle(bands[i]).getPropertyValue('--fg'));
  info();
  schedule();
  startSound(i);                         // music starts as soon as a band is clicked
}
function collapse() {                      // back to the full stack; the music keeps playing
  active = -1;
  stage.classList.remove('open');
  document.body.classList.remove('open');
  document.body.style.removeProperty('--ink');
  bands.forEach(b => {
    b.classList.remove('active', 'edge', 'settled');
    b.title = '';
    b.querySelector('canvas').width = 0;
  });
  info();
}

function close() {                         // esc or clicking VOID -> stop the music
  collapse();
  stopAll(); playing = -1;
}
$('home').addEventListener('click', close);
$('home').addEventListener('keydown', e => { if (e.key === 'Enter') close(); });
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') close();
  if (active > 0 && e.key === 'ArrowUp') open(active - 1);
  if (active >= 0 && active < SOUNDS.length - 1 && e.key === 'ArrowDown') open(active + 1);
});

/* audio */
function stopAll() {
  if (audio) { audio.pause(); audio = null; }
  if (playing >= 0) bands[playing].querySelector('.play').innerHTML = PLAY;
}
function startSound(i) {
  if (playing === i) return;
  stopAll();
  const s = SOUNDS[i];
  if (!s.audio) return;                    // stay silent
  audio = new Audio(s.audio);
  audio.loop = true;
  audio.play().catch(() => {});
  playing = i;
  bands[i].querySelector('.play').innerHTML = PAUSE;
}

function toggle(i) {                       // the play button
  if (playing === i) { stopAll(); playing = -1; }
  else startSound(i);
}

/* particles */
function drawParticles() {
  if (active < 0) return;
  const b = bands[active], c = b.querySelector('canvas');
  const w = b.clientWidth, h = b.clientHeight, d = devicePixelRatio || 1;
  c.width = w * d; c.height = h * d;
  const g = c.getContext('2d');
  g.setTransform(d, 0, 0, d, 0, 0);
  const list = SOUNDS[active].particles || [];
  const score = p => (p.replies || 0) + (p.reactions || 0);
  const top = Math.max(1, ...list.map(score));
  g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 20;
  list.forEach((p, i) => {
    const r = PARTICLE.inner + Math.pow(score(p) / top, PARTICLE.curve) * (PARTICLE.outer - PARTICLE.inner);
    const a = (p.angle != null ? p.angle : i * 137.508) * Math.PI / 180;
    g.beginPath();
    g.arc(w / 2 + Math.cos(a) * r * w, h / 2 + Math.sin(a) * r * h, p.size || 4, 0, 6.3);
    g.fill();
  });
}

function schedule() {
  clearTimeout(settle);
  if (active < 0) return;
  bands[active].classList.remove('settled');
  settle = setTimeout(() => {
    if (active < 0) return;
    drawParticles();
    bands[active].classList.add('settled');
  }, 150);
}
const ro = new ResizeObserver(schedule);
bands.forEach(b => ro.observe(b));

/* send to the void */
bands.forEach((b, i) => {
  const f = b.querySelector('.send');
  if (!f) return;
  f.addEventListener('submit', e => {
    e.preventDefault();
    const input = f.querySelector('input');
    if (!input.value.trim()) return;
    SOUNDS[i].particles.push({replies: 0, reactions: 0});
    input.value = '';
    drawParticles();
  });
});