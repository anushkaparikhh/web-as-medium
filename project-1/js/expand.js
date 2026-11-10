const $ = id => document.getElementById(id);
const stage = $('stage');
const PLAY  = '<svg viewBox="0 0 12 12"><path d="M2 1l9 5-9 5z"/></svg>';
const PAUSE = '<svg viewBox="0 0 12 12"><path d="M2 1h3v10H2zM7 1h3v10H7z"/></svg>';
const PREV  = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 2v12M14 2L5 8l9 6z"/></svg>';
const NEXT  = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M13 2v12M2 2l9 6-9 6z"/></svg>';

let active = -1, playing = -1, audio = null, settle = null;

/* particle distance */
const PARTICLE = {inner:0.03, outer:0.46, curve:1};

const COMMENTS = {radius:30, sendAlwaysVisible:true}; //comment visible distance to cursor
let dots = [], paint2d = null, cw = 0, ch = 0;   

/* band info */
const bands = [...stage.children];
const SOUNDS = bands.map(b => ({
  title: b.dataset.title, dur: b.dataset.dur, views: b.dataset.views, source: b.dataset.source,
  audio: b.dataset.audio || '',
  particles: JSON.parse(b.dataset.particles || '[]')
}));

/* x out */
document.body.insertAdjacentHTML('beforeend',
  '<button id="x" aria-label="Close"><svg viewBox="0 0 18 18"><path d="M3 3l12 12M15 3L3 15"/></svg></button>');
$('x').addEventListener('click', close);

bands.forEach((b, i) => {
  const s = SOUNDS[i], p = b.querySelector('p');
  b.tabIndex = 0;
  b.setAttribute('role', 'button');
  b.setAttribute('aria-label', s.title);
  b.insertAdjacentHTML('afterbegin', '<canvas></canvas>');
  const inner = document.createElement('div');
  inner.className = 'inner';
  inner.innerHTML =
    '<div class="col-l"></div>' +
    '<div class="col-c"><div class="controls">' +
      '<button class="nav prev" aria-label="Previous sound">' + PREV + '</button>' +
      '<button class="play" aria-label="Play sound">' + PLAY + '</button>' +
      '<button class="nav next" aria-label="Next sound">' + NEXT + '</button>' +
    '</div><div class="name"><div class="ttl"></div><div class="dur"></div></div></div>' +
    '<div class="col-r"><div class="src"></div><div class="views"></div></div>';
  inner.querySelector('.col-l').appendChild(p);
  inner.querySelector('.ttl').textContent = s.title;
  inner.querySelector('.dur').textContent = s.dur;
  inner.querySelector('.src').textContent = s.source;
  inner.querySelector('.views').textContent = s.views;
  b.appendChild(inner);

  const fit = () => { if (active < 0) b.style.setProperty('--fit', inner.offsetHeight + 'px'); };  // hover height = content height
  b.addEventListener('mouseenter', fit);
  b.addEventListener('focus', fit);
  b.addEventListener('click', () => { if (active !== i) open(i); });
  b.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === b) { e.preventDefault(); open(i); } });
  b.querySelector('.play').addEventListener('click', e => { e.stopPropagation(); toggle(i); });
  b.querySelector('.prev').addEventListener('click', e => { e.stopPropagation(); if (i > 0) open(i - 1); });
  b.querySelector('.next').addEventListener('click', e => { e.stopPropagation(); if (i < bands.length - 1) open(i + 1); });
  b.querySelector('.prev').disabled = i === 0;
  b.querySelector('.next').disabled = i === bands.length - 1;
});

/* ---------- open / close ---------- */
function clearCloud(b) {
  b.querySelector('canvas').width = 0;
  b.querySelectorAll('.comment').forEach(c => c.remove());
}
function open(i) {
  active = i;
  stage.classList.add('open');
  document.body.classList.add('open');
  bands.forEach((b, j) => {
    b.classList.toggle('active', j === i);
    b.classList.toggle('gone', j !== i);      // every other band disappears
    b.classList.remove('settled');
    clearCloud(b);
  });
  document.body.style.setProperty('--ink', getComputedStyle(bands[i]).getPropertyValue('--fg'));
  schedule();
  startSound(i);                           
}
function collapse() {
  active = -1;
  stage.classList.remove('open');
  document.body.classList.remove('open');
  document.body.style.removeProperty('--ink');
  bands.forEach(b => { b.classList.remove('active', 'gone', 'settled'); clearCloud(b); });
}
function close() { collapse(); stopAll(); playing = -1; }   // triggered by x or skip
$('home')?.addEventListener('click', close);
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') close();
  if (active > 0 && e.key === 'ArrowUp') open(active - 1);
  if (active >= 0 && active < bands.length - 1 && e.key === 'ArrowDown') open(active + 1);
});

/*sound*/
function stopAll() {
  if (audio) { audio.pause(); audio = null; }
  if (playing >= 0) bands[playing].querySelector('.play').innerHTML = PLAY;
}
function startSound(i) {
  if (playing === i) return;
  stopAll();
  const s = SOUNDS[i];
  if (!s.audio) return;                  
  audio = new Audio(s.audio);
  audio.loop = true;
  audio.play().catch(() => {});
  playing = i;
  bands[i].querySelector('.play').innerHTML = PAUSE;
}
function toggle(i) {
  if (playing === i) { stopAll(); playing = -1; }
  else startSound(i);
}

/* particles and comments */
function drawParticles() {
  if (active < 0) return;
  const b = bands[active], c = b.querySelector('canvas');
  const w = b.clientWidth, h = b.clientHeight, d = devicePixelRatio || 1;
  c.width = w * d; c.height = h * d;
  paint2d = c.getContext('2d');
  paint2d.setTransform(d, 0, 0, d, 0, 0);
  cw = w; ch = h; dots = [];
  b.querySelectorAll('.comment').forEach(el => el.remove());
  const list = SOUNDS[active].particles || [];
  const score = p => (p.replies || 0) + (p.reactions || 0);
  const top = Math.max(1, ...list.map(score));
  list.forEach((p, i) => {
    const r = PARTICLE.inner + Math.pow(score(p) / top, PARTICLE.curve) * (PARTICLE.outer - PARTICLE.inner);
    const a = (p.angle != null ? p.angle : i * 137.508) * Math.PI / 180;
    const size = p.size || 4;
    const dot = {x: w / 2 + Math.cos(a) * r * w, y: h / 2 + Math.sin(a) * r * h, r: size, data: p};
    dots.push(dot);
    if (p.comment || p.send) {              // comment placement
      const left = p.side === 'left';
      const el = document.createElement(p.send ? 'form' : 'span');
      const always = p.send && COMMENTS.sendAlwaysVisible;
      el.className = 'comment' + (p.send ? ' sendbox' : '') + (always ? ' always' : '') + (left ? ' left' : '');
      if (p.font) el.classList.add('font-' + p.font); 
      if (p.send) {
        el.autocomplete = 'off';
        el.innerHTML = '<input maxlength="120" aria-label="Send to the void"><button aria-label="Send"><svg viewBox="0 0 24 24"><path d="M2 3l20 9-20 9 3-9z"/></svg></button>';
        el.querySelector('input').placeholder = p.placeholder || 'send to the void…';
        el.addEventListener('submit', e => {
          e.preventDefault();
          const text = el.querySelector('input').value.trim();
          if (text) send(text, el.querySelector('input'));
        });
      } else el.textContent = p.comment;
      el.style.left = (dot.x + (left ? -1 : 1) * (size + 10)) + 'px';
      el.style.top = dot.y + 'px';
      b.appendChild(el);
      dot.el = el;
    }
  });
  paintDots();
}
function paintDots() {                      // glow state
  if (!paint2d) return;
  paint2d.clearRect(0, 0, cw, ch);
  paint2d.fillStyle = '#fff'; paint2d.shadowColor = '#fff';
  dots.forEach(p => {
    paint2d.shadowBlur = p.data.seen ? 20 : 0;      // from first interaction
    paint2d.beginPath(); paint2d.arc(p.x, p.y, p.r, 0, 6.3); paint2d.fill();
  });
}

/* submit alert */
function send(text, input) {
  input.value = '';
  alert('Your comment was successfully submitted to the void.');
}

function schedule() {                      // animation to full size
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

/* cursor and glow function */
function nearParticle(e) {
  if (active < 0) return;
  const r = bands[active].getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  let best = null, bd = COMMENTS.radius;
  dots.forEach(p => { const d = Math.hypot(p.x - mx, p.y - my) - p.r; if (d < bd) { bd = d; best = p; } });
  dots.forEach(p => p.el && p.el.classList.toggle('show', p === best));
  if (best && !best.data.seen) { best.data.seen = true; paintDots(); }   // glow stay
}
function hideComments() {
  dots.forEach(p => p.el && p.el.classList.remove('show'));
}
stage.addEventListener('pointermove', nearParticle);       
stage.addEventListener('pointerdown', nearParticle);       // for phone
stage.addEventListener('pointerleave', hideComments);