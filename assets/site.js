// Lógica compartida: iconos, índice de las páginas legales, fondo de partículas y animaciones de scroll.
// La web es solo de tema oscuro.
(function () {
    var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    // ---------- Iconos propios (trazos tipo Lucide, sin dependencias externas) ----------
    var ICONS = {
        x: '<path d="M18 6 6 18M6 6l12 12"/>',
        smartphone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
        'life-buoy': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="m4.93 4.93 4.24 4.24M14.83 9.17l4.24-4.24M14.83 14.83l4.24 4.24M9.17 14.83l-4.24 4.24"/>',
        layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
        'chevron-down': '<path d="m6 9 6 6 6-6"/>',
        mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
        'trash-2': '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>'
    };
    function renderIcons() {
        document.querySelectorAll('[data-icon]').forEach(function (el) {
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
            svg.setAttribute('stroke-width', '2'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
            svg.setAttribute('aria-hidden', 'true');
            svg.setAttribute('class', el.getAttribute('class') || '');
            svg.innerHTML = ICONS[el.getAttribute('data-icon')] || '';
            el.replaceWith(svg);
        });
    }

    // ---------- Índice lateral en páginas legales ----------
    function initToc() {
        var content = document.querySelector('.content');
        if (!content) return;
        var heads = content.querySelectorAll('h2');
        if (heads.length < 3) return;
        var layout = document.createElement('div'); layout.className = 'legal-layout';
        var aside = document.createElement('aside'); aside.className = 'toc'; aside.setAttribute('aria-label', 'Índice');
        var label = document.createElement('span'); label.textContent = 'En esta página'; aside.appendChild(label);
        var links = [];
        heads.forEach(function (h, i) {
            h.id = h.id || 'sec-' + (i + 1);
            var a = document.createElement('a'); a.href = '#' + h.id; a.textContent = h.textContent;
            aside.appendChild(a); links.push(a);
        });
        content.parentNode.insertBefore(layout, content);
        layout.appendChild(aside); layout.appendChild(content);
        if (!('IntersectionObserver' in window)) return;
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) {
                    links.forEach(function (l) { l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id); });
                }
            });
        }, { rootMargin: '-20% 0px -70% 0px' });
        heads.forEach(function (h) { io.observe(h); });
    }

    // =====================================================================
    // Fondo de partículas
    // En la portada, un enjambre de pequeños triángulos forma un teléfono junto al titular. Al bajar por la
    // página (en pantallas anchas) el enjambre se deshace y vuelve a formarse junto a cada sección:
    // icono de app → engranaje → átomo → interrogación → sobre. En pantallas estrechas el teléfono
    // simplemente se deshace al hacer scroll. Por toda la página flotan además partículas sueltas.
    // =====================================================================
    function initParticles() {
        var canvas = document.createElement('canvas');
        canvas.id = 'bg-constellation';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(canvas, document.body.firstChild);
        var ctx = canvas.getContext('2d');
        if (!ctx) return;

        var reduce = REDUCE;
        var small = Math.min(window.innerWidth, window.innerHeight) < 700 || (navigator.hardwareConcurrency || 8) <= 4;
        var hero = document.querySelector('.hero'), visual = document.querySelector('.hero-visual');
        var W = 0, H = 0, dpr = 1, scrollY = window.scrollY || 0, lastFrame = 0, t0 = performance.now();
        var mx = 0, my = 0, tx = 0, ty = 0, px = -9999, py = -9999;

        var VIOLET = '128,82,255', LAVENDER = '180,156,255', AMBER = '255,184,41', TEAL = '43,196,164',
            MAGENTA = '224,75,214', BLUE = '79,123,255', WHITE = '235,235,245';
        var ICON_COLORS = [VIOLET, AMBER, TEAL, MAGENTA, BLUE, LAVENDER];
        function rand(a, b) { return a + Math.random() * (b - a); }
        function ease(x) { return x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3); }
        function easeIO(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
        function smooth(a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }

        // ----- Utilidades de muestreo de formas (2D) -----
        function rrect2(w, h, r, n) { // contorno de rectángulo redondeado
            var out = [], sw = w - 2 * r, sh = h - 2 * r, arc = Math.PI * r / 2, per = 2 * sw + 2 * sh + 4 * arc;
            for (var i = 0; i < n; i++) {
                var d = (i / n) * per, x, y, a;
                if (d < sw) { x = -sw / 2 + d; y = h / 2; }
                else if ((d -= sw) < arc) { a = d / r; x = sw / 2 + Math.sin(a) * r; y = sh / 2 + Math.cos(a) * r; }
                else if ((d -= arc) < sh) { x = w / 2; y = sh / 2 - d; }
                else if ((d -= sh) < arc) { a = d / r; x = sw / 2 + Math.cos(a) * r; y = -sh / 2 - Math.sin(a) * r; }
                else if ((d -= arc) < sw) { x = sw / 2 - d; y = -h / 2; }
                else if ((d -= sw) < arc) { a = d / r; x = -sw / 2 - Math.sin(a) * r; y = -sh / 2 - Math.cos(a) * r; }
                else if ((d -= arc) < sh) { x = -w / 2; y = -sh / 2 + d; }
                else { d -= sh; a = d / r; x = -sw / 2 - Math.cos(a) * r; y = sh / 2 + Math.sin(a) * r; }
                out.push([x, y]);
            }
            return out;
        }
        function line2(x1, y1, x2, y2, n) { var o = []; for (var i = 0; i < n; i++) { var k = n === 1 ? 0.5 : i / (n - 1); o.push([x1 + (x2 - x1) * k, y1 + (y2 - y1) * k]); } return o; }
        function circle2(r, n, a0, a1) { var o = []; a0 = a0 || 0; a1 = a1 == null ? 6.2832 : a1; for (var i = 0; i < n; i++) { var a = a0 + (a1 - a0) * (i / n); o.push([Math.cos(a) * r, Math.sin(a) * r]); } return o; }

        // ===== Teléfono (forma inicial; define el número de partículas y sus colores) =====
        var PW = 1, PH = 2.05, D = 0.07, dens = small ? 0.55 : 1, pts = [];
        function N(n) { return Math.max(6, Math.round(n * dens)); }
        function addSet(list, ox, oy, z, color, kind, icon) {
            list.forEach(function (q) {
                var dir = [rand(-1, 1), rand(-1, 1), rand(-1, 1)], l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
                pts.push({ hx: ox + q[0], hy: oy + q[1], hz: z, c: typeof color === 'function' ? color() : color,
                    kind: kind || 0, icon: icon == null ? -1 : icon, dx: dir[0] / l, dy: dir[1] / l, dz: dir[2] / l,
                    far: rand(2.5, 5), delay: rand(0, 900), s: rand(1.3, 2.4), a: rand(0, 6.28), spin: rand(-1, 1) * 0.0008,
                    ph: rand(0, 6.28), ox: 0, oy: 0 });
            });
        }
        var frame = function () { return Math.random() < 0.7 ? VIOLET : LAVENDER; };
        addSet(rrect2(PW, PH, 0.17, N(300)), 0, 0, D, frame);
        addSet(rrect2(PW, PH, 0.17, N(220)), 0, 0, -D, frame);
        addSet(rrect2(PW, PH, 0.17, N(140)), 0, 0, 0, frame);
        addSet(rrect2(PW - 0.08, PH - 0.08, 0.13, N(190)), 0, 0, D, function () { return Math.random() < 0.5 ? LAVENDER : BLUE; });
        addSet(rrect2(0.27, 0.075, 0.037, N(30)), 0, PH / 2 - 0.12, D, WHITE);
        var ic = 0, col, row, IS = 0.165, GX = 0.215, GY = 0.25;
        for (row = 0; row < 5; row++) for (col = 0; col < 4; col++) {
            addSet(rrect2(IS, IS, 0.05, N(30)), -1.5 * GX + col * GX, 0.66 - row * GY, D, ICON_COLORS[(ic * 5 + row) % ICON_COLORS.length], 1, ic); ic++;
        }
        addSet(rrect2(PW - 0.2, 0.22, 0.08, N(60)), 0, -0.8, D, LAVENDER);
        for (col = 0; col < 4; col++) { addSet(rrect2(IS - 0.01, IS - 0.01, 0.047, N(26)), -1.5 * GX + col * GX, -0.8, D, ICON_COLORS[(col + 2) % ICON_COLORS.length], 1, ic); ic++; }
        var ICONS_TOTAL = ic;
        addSet(rrect2(0.4, 0.4, 0.1, N(50)), -0.22, 0.72, -D, LAVENDER);
        addSet(circle2(0.07, N(18)), -0.31, 0.81, -D, WHITE); addSet(circle2(0.07, N(18)), -0.13, 0.81, -D, WHITE);
        addSet(circle2(0.07, N(18)), -0.31, 0.63, -D, WHITE); addSet(circle2(0.04, N(10)), -0.13, 0.63, -D, AMBER);
        var sparkle = []; for (var k = 0; k < N(70); k++) sparkle.push([rand(-0.42, 0.42), rand(-0.95, 0.95)]);
        addSet(sparkle, 0, 0, D, function () { return Math.random() < 0.5 ? AMBER : TEAL; }, 2);
        var NP = pts.length;

        // ===== Formas de las secciones: cada una devuelve exactamente NP puntos [x, y, z, g] =====
        // g ≥ 0 marca puntos con brillo animado (órbitas del átomo); -1 = sin brillo.
        function fit(list) { // ajusta a NP puntos y los baraja, para que cada partícula viaje a un sitio distinto
            var out = [], i;
            for (i = 0; i < NP; i++) {
                var q = list[i % list.length];
                out.push(i < list.length ? q.slice() : [q[0] + rand(-0.02, 0.02), q[1] + rand(-0.02, 0.02), q[2] + rand(-0.02, 0.02), q[3]]);
            }
            for (i = out.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, tmp = out[i]; out[i] = out[j]; out[j] = tmp; }
            return out;
        }
        function z3(list, z, g) { return list.map(function (q) { return [q[0], q[1], z, g == null ? -1 : g]; }); }
        function thick(list, w, zd) { // engrosa un trazo con desplazamientos aleatorios
            return list.map(function (q) { return [q[0] + rand(-w, w), q[1] + rand(-w, w), rand(-zd, zd), -1]; });
        }
        function shift(list, ox, oy) { return list.map(function (q) { return [q[0] + ox, q[1] + oy]; }); }
        var M = NP / 1300; // proporción respecto a la versión de escritorio

        // Icono de app con botón de reproducir y destellos alrededor
        function shapeTile() {
            var L = [], n = function (v) { return Math.max(8, Math.round(v * M)); };
            L = L.concat(z3(rrect2(1.5, 1.5, 0.38, n(380)), 0.08), z3(rrect2(1.5, 1.5, 0.38, n(260)), -0.08), z3(rrect2(1.5, 1.5, 0.38, n(120)), 0));
            var tri = [].concat(line2(-0.24, 0.4, 0.44, 0, n(70)), line2(0.44, 0, -0.24, -0.4, n(70)), line2(-0.24, -0.4, -0.24, 0.4, n(70)));
            L = L.concat(thick(tri, 0.02, 0.05));
            for (var i = 0; i < n(240); i++) { var a = rand(0, 6.28), r = rand(1.15, 1.55); L.push([Math.cos(a) * r, Math.sin(a) * r, rand(-0.4, 0.4), -1]); }
            return fit(L);
        }
        // Engranaje (gira sobre sí mismo)
        function shapeGear() {
            var L = [], n = function (v) { return Math.max(8, Math.round(v * M)); }, prof = [], i, a, r;
            for (i = 0; i < n(420); i++) { a = (i / n(420)) * 6.2832; r = 0.82 + 0.18 * Math.tanh(5 * Math.cos(9 * a)); prof.push([Math.cos(a) * r, Math.sin(a) * r]); }
            L = L.concat(z3(prof, 0.13), z3(prof.filter(function (_, k) { return k % 2 === 0; }), -0.13));
            L = L.concat(z3(circle2(0.34, n(110)), 0.13), z3(circle2(0.34, n(90)), -0.13), z3(circle2(0.58, n(150)), 0.13));
            for (i = 0; i < 6; i++) { a = i * 1.0472; L = L.concat(z3(line2(Math.cos(a) * 0.36, Math.sin(a) * 0.36, Math.cos(a) * 0.56, Math.sin(a) * 0.56, n(12)), 0.13)); }
            for (i = 0; i < n(200); i++) { a = rand(0, 6.28); r = 0.82 + 0.18 * Math.tanh(5 * Math.cos(9 * a)); L.push([Math.cos(a) * r, Math.sin(a) * r, rand(-0.13, 0.13), -1]); }
            return fit(L);
        }
        // Átomo: núcleo y tres órbitas con electrones que las recorren
        function shapeAtom() {
            var L = [], n = function (v) { return Math.max(8, Math.round(v * M)); }, i, o;
            var core = n(300), GA = Math.PI * (3 - Math.sqrt(5));
            for (i = 0; i < core; i++) { var y = 1 - (i / (core - 1)) * 2, rr = Math.sqrt(1 - y * y); L.push([Math.cos(GA * i) * rr * 0.24, y * 0.24, Math.sin(GA * i) * rr * 0.24, -1]); }
            for (o = 0; o < 3; o++) {
                var rotA = o * 1.0472, tilt = 1.15, cnt = n(330);
                for (i = 0; i < cnt; i++) {
                    var ph = i / cnt, a = ph * 6.2832, ex = Math.cos(a) * 1.15, ey = Math.sin(a) * 1.15, ez = 0;
                    var ey2 = ey * Math.cos(tilt), ez2 = ey * Math.sin(tilt);           // inclinar la órbita
                    var x = ex * Math.cos(rotA) - ey2 * Math.sin(rotA), y2 = ex * Math.sin(rotA) + ey2 * Math.cos(rotA);
                    L.push([x + rand(-0.012, 0.012), y2 + rand(-0.012, 0.012), ez2 + ez, o + ph * 0.999]);
                }
            }
            return fit(L);
        }
        // Signo de interrogación grueso
        function shapeQuestion() {
            var path = [], n = function (v) { return Math.max(8, Math.round(v * M)); }, i;
            path = path.concat(shift(circle2(0.48, n(420), 3.0, -0.75), 0, 0.45));             // arco superior
            var ex = Math.cos(-0.75) * 0.48, ey = 0.45 + Math.sin(-0.75) * 0.48;
            path = path.concat(line2(ex, ey, 0.02, -0.18, n(120)), line2(0.02, -0.18, 0.02, -0.42, n(100)));
            var L = thick(path, 0.075, 0.1);
            for (i = 0; i < n(200); i++) { var a = rand(0, 6.28), r = Math.sqrt(Math.random()) * 0.12; L.push([0.02 + Math.cos(a) * r, -0.74 + Math.sin(a) * r, rand(-0.1, 0.1), -1]); }
            for (i = 0; i < n(160); i++) { var b = rand(0, 6.28), rr = rand(1.2, 1.5); L.push([Math.cos(b) * rr * 0.8, Math.sin(b) * rr, rand(-0.3, 0.3), -1]); }
            return fit(L);
        }
        // Sobre de correo con la solapa
        function shapeEnvelope() {
            var L = [], n = function (v) { return Math.max(8, Math.round(v * M)); };
            L = L.concat(z3(rrect2(1.9, 1.25, 0.1, n(420)), 0.06), z3(rrect2(1.9, 1.25, 0.1, n(260)), -0.06));
            var flap = [].concat(line2(-0.93, 0.6, 0, -0.08, n(150)), line2(0, -0.08, 0.93, 0.6, n(150)));
            L = L.concat(thick(flap, 0.012, 0.04));
            L = L.concat(z3([].concat(line2(-0.93, -0.6, -0.3, 0.05, n(70)), line2(0.93, -0.6, 0.3, 0.05, n(70))), 0.06));
            for (var i = 0; i < n(170); i++) { var a = rand(0, 6.28), r = rand(1.25, 1.6); L.push([Math.cos(a) * r, Math.sin(a) * r * 0.75, rand(-0.3, 0.3), -1]); }
            return fit(L);
        }
        var phoneShape = pts.map(function (p) { return [p.hx, p.hy, p.hz, -1]; });

        // Estaciones: dónde se coloca cada forma. Solo en pantallas anchas (hay hueco a la derecha del contenido).
        var DEFS = [
            { sel: '#apps', shape: shapeTile, s: 95, base: -0.3 },
            { sel: '#metodo .section-head', shape: shapeGear, s: 82, base: -0.25, gear: true },
            { sel: '#stack', shape: shapeAtom, s: 105, base: -0.2, atom: true },
            { sel: '#faq', shape: shapeQuestion, s: 120, base: -0.3 },
            { sel: '.cta-box', shape: shapeEnvelope, s: 82, base: -0.3, inset: 230 }
        ];
        var stations = [], built = false;
        function buildShapes() { // las formas se generan solo la primera vez que hacen falta
            if (built) return; built = true;
            DEFS.forEach(function (d) { if (document.querySelector(d.sel)) d.pts = d.shape(); });
        }

        function measure() {
            var sy = window.scrollY || 0;
            stations = [];
            if (!hero) return;
            var vr = visual && visual.getBoundingClientRect(), hr = hero.getBoundingClientRect();
            var st = { pts: phoneShape, base: -0.42, phone: true, h: Math.max(hr.height, 300) };
            if (vr && vr.width > 40) { // escritorio: a la derecha del titular
                st.x = vr.left + vr.width / 2; st.y = vr.top + sy + vr.height / 2;
                st.s = Math.min(vr.height * 0.74 / PH, vr.width * 0.62, 300);
            } else { // móvil: debajo del texto
                var pad = parseFloat(getComputedStyle(hero).paddingBottom) || 300;
                st.s = Math.min(pad * 0.8 / PH, W * 0.42); st.x = W / 2; st.y = hr.bottom + sy - pad / 2;
            }
            stations.push(st);
            var cont = document.querySelector('main .container');
            if (W < 1200 || !cont) return;
            buildShapes();
            var right = cont.getBoundingClientRect().right - 24;
            DEFS.forEach(function (d) {
                var el = document.querySelector(d.sel); if (!el || !d.pts) return;
                var r = el.getBoundingClientRect();
                stations.push({ pts: d.pts, base: d.base, gear: d.gear, atom: d.atom, s: d.s,
                    x: d.inset ? r.right - d.inset : right - d.s * 1.55, y: r.top + sy + r.height / 2 });
            });
            stations.sort(function (a, b) { return a.y - b.y; });
        }

        var DUST = small ? 26 : 60, dust = [], COLORS = [VIOLET, VIOLET, LAVENDER, AMBER, TEAL, MAGENTA, BLUE];
        for (k = 0; k < DUST; k++) {
            dust.push({ x: Math.random(), y: Math.random(), vx: rand(-1, 1) * 0.000006, vy: rand(-1, 1) * 0.000006,
                c: COLORS[(Math.random() * COLORS.length) | 0], s: rand(1.6, 3.4), a: rand(0, 6.28), spin: rand(-1, 1) * 0.0004, o: rand(0.12, 0.34) });
        }

        function tri(x, y, s, ang) {
            ctx.moveTo(x + Math.cos(ang) * s, y + Math.sin(ang) * s);
            ctx.lineTo(x + Math.cos(ang + 2.094) * s, y + Math.sin(ang + 2.094) * s);
            ctx.lineTo(x + Math.cos(ang + 4.189) * s, y + Math.sin(ang + 4.189) * s);
            ctx.closePath();
        }

        function resize() {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = window.innerWidth; H = window.innerHeight;
            canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
            canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
            measure();
            draw(performance.now());
        }

        function draw(now) {
            if (!W || !H) return;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, W, H);
            ctx.lineWidth = 1; ctx.lineJoin = 'round';
            var t = reduce ? 0 : now, el = reduce ? 1e9 : now - t0;

            dust.forEach(function (d) {
                var x = ((d.x + d.vx * t) % 1 + 1) % 1 * W, y = ((d.y + d.vy * t) % 1 + 1) % 1 * H;
                ctx.strokeStyle = 'rgba(' + d.c + ',' + d.o + ')';
                ctx.beginPath(); tri(x, y, d.s, d.a + d.spin * t); ctx.stroke();
            });
            if (!stations.length) return;

            // ¿Entre qué dos estaciones estamos? m = 0 → forma A, m = 1 → forma B
            var A = stations[0], B = stations[0], m = 0, spread = 0;
            if (stations.length > 1) {
                var yc = scrollY + H * 0.5, i = 0;
                while (i < stations.length - 1 && yc >= stations[i + 1].y) i++;
                A = stations[i]; B = stations[Math.min(i + 1, stations.length - 1)];
                if (A !== B) m = smooth(0.25, 0.75, (yc - A.y) / (B.y - A.y));
                if (m > 0.999) { A = B; m = 0; }
            } else {
                spread = clamp(scrollY / (A.h * 0.85), 0, 1); // pantallas estrechas: el teléfono se deshace
                if (spread >= 1) return;
            }
            var S = A.s + (B.s - A.s) * m, cx = A.x + (B.x - A.x) * m, cy = A.y + (B.y - A.y) * m - scrollY;
            if (cy + S * 2.5 < 0 || cy - S * 2.5 > H) return;
            cy += reduce ? 0 : Math.sin(t * 0.0011) * S * 0.04;
            var wPhone = (A.phone ? 1 - m : 0) + (B.phone && A !== B ? m : 0);
            var scatter = Math.sin(Math.PI * m);                                          // se dispersa a mitad del cambio

            var rotY = A.base + (B.base - A.base) * m + (reduce ? 0 : Math.sin(t * 0.0004) * 0.38) + tx * 0.7;
            var cyc = (el % 13000) / 13000;
            if (!reduce && el > 4000 && cyc > 0.78 && A.phone && m === 0) rotY += easeIO((cyc - 0.78) / 0.22) * 6.2832;
            var rotX = 0.1 + (reduce ? 0 : Math.sin(t * 0.0003) * 0.07) + ty * 0.35, rotZ = reduce ? 0.06 : 0.06 + Math.sin(t * 0.0005) * 0.04;
            var cY = Math.cos(rotY), sY = Math.sin(rotY), cX = Math.cos(rotX), sX = Math.sin(rotX), cZ = Math.cos(rotZ), sZ = Math.sin(rotZ);
            var gA = A.gear ? t * 0.00035 : 0, gB = B.gear ? t * 0.00035 : 0;           // el engranaje gira sobre sí mismo
            var cgA = Math.cos(gA), sgA = Math.sin(gA), cgB = Math.cos(gB), sgB = Math.sin(gB);
            var lit = Math.floor(t / 420) % ICONS_TOTAL, lit2 = (lit + 7) % ICONS_TOTAL;
            var scan = 1.15 - ((t * 0.00045) % 2.6);
            var F = 4, R2 = 110 * 110;

            for (var n = 0; n < NP; n++) {
                var p = pts[n], qa = A.pts[n], qb = B.pts[n];
                var ax = qa[0] * cgA - qa[1] * sgA, ay = qa[0] * sgA + qa[1] * cgA;
                var bx = qb[0] * cgB - qb[1] * sgB, by = qb[0] * sgB + qb[1] * cgB;
                var asm = ease((el - p.delay) / 1700);
                var out = (1 - asm) * p.far + Math.pow(spread, 1.4) * p.far * 0.9 + scatter * p.far * 0.28;
                var wob = reduce ? 0 : 0.006;
                var x = ax + (bx - ax) * m + p.dx * out + Math.sin(t * 0.002 + p.ph) * wob;
                var y = ay + (by - ay) * m + p.dy * out + Math.cos(t * 0.0017 + p.ph) * wob;
                var z = qa[2] + (qb[2] - qa[2]) * m + p.dz * out;
                var x1 = x * cZ - y * sZ, y1 = x * sZ + y * cZ;
                var x2 = x1 * cY + z * sY, z2 = -x1 * sY + z * cY;
                var y3 = y1 * cX - z2 * sX, z4 = y1 * sX + z2 * cX;
                var persp = F / (F - z4);
                var sx = cx + x2 * S * persp, sy = cy - y3 * S * persp;

                var ddx = sx - px, ddy = sy - py, d2 = ddx * ddx + ddy * ddy, tox = 0, toy = 0;
                if (d2 < R2) { var dd = Math.sqrt(d2) || 1, f = (1 - dd / 110) * 34; tox = ddx / dd * f; toy = ddy / dd * f; }
                p.ox += (tox - p.ox) * 0.12; p.oy += (toy - p.oy) * 0.12;
                sx += p.ox; sy += p.oy;

                var front = clamp((z4 + 0.6) / 1.2, 0, 1);
                var alpha = (0.12 + 0.88 * front * front) * (0.35 + 0.65 * asm) * (1 - spread) * (1 - scatter * 0.35);
                var size = p.s * persp;
                if (wPhone > 0) {
                    var boost = 1;
                    if (p.kind === 1) { boost = (p.icon === lit || p.icon === lit2) ? 1.6 : 1.15; size *= p.icon === lit || p.icon === lit2 ? 1 + 0.5 * wPhone : 1 - 0.15 * wPhone; }
                    if (p.kind === 2) boost = reduce ? 0.6 : 0.3 + 0.7 * Math.abs(Math.sin(t * 0.003 + p.ph));
                    if (p.hz > 0 && Math.abs(p.hy - scan) < 0.07) { alpha += 0.45 * wPhone; size *= 1 + 0.35 * wPhone; }
                    alpha *= 1 + (boost - 1) * wPhone;
                }
                var g = m < 0.5 ? qa[3] : qb[3];
                if (g >= 0 && !reduce) { // electrones recorriendo las órbitas
                    var grp = Math.floor(g), ph = g - grp, e = (ph - t * 0.00022 - grp * 0.33) % 1; if (e < 0) e += 1;
                    if (e < 0.05) { alpha += 0.6 * (1 - e / 0.05) * (1 - scatter); size *= 1.6; }
                }
                alpha = clamp(alpha, 0, 1);
                ctx.strokeStyle = 'rgba(' + p.c + ',' + alpha.toFixed(3) + ')';
                ctx.beginPath(); tri(sx, sy, size, p.a + p.spin * t); ctx.stroke();
            }
        }

        function loop(now) {
            requestAnimationFrame(loop);
            if (document.hidden) return;
            if (small && now - lastFrame < 33) return;
            lastFrame = now;
            tx += (mx - tx) * 0.05; ty += (my - ty) * 0.05;
            draw(now);
        }

        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('load', resize);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
        document.querySelectorAll('.faq details').forEach(function (d) { d.addEventListener('toggle', function () { setTimeout(measure, 50); }); });
        window.addEventListener('scroll', function () { scrollY = window.scrollY; if (reduce) draw(0); }, { passive: true });
        if (!reduce) {
            window.addEventListener('pointermove', function (e) {
                mx = e.clientX / W - 0.5; my = e.clientY / H - 0.5; px = e.clientX; py = e.clientY;
            }, { passive: true });
            document.addEventListener('pointerleave', function () { px = py = -9999; });
            requestAnimationFrame(loop);
        }
    }

    // =====================================================================
    // Animaciones del contenido al hacer scroll
    // =====================================================================
    // Parte un texto en palabras envueltas, para animarlas una a una
    function splitWords(el, cls) {
        var words = el.textContent.trim().split(/\s+/);
        el.setAttribute('aria-label', el.textContent.trim());
        el.textContent = '';
        words.forEach(function (w, i) {
            var outer = document.createElement('span'); outer.className = cls; outer.setAttribute('aria-hidden', 'true');
            outer.style.setProperty('--i', i);
            if (cls === 'w') { var inner = document.createElement('span'); inner.textContent = w; outer.appendChild(inner); }
            else outer.textContent = w;
            el.appendChild(outer);
            if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
        });
        return el.querySelectorAll('.' + cls);
    }

    function initScrollFx() {
        // Barra de progreso de lectura
        var bar = document.createElement('div'); bar.className = 'scroll-progress'; bar.setAttribute('aria-hidden', 'true');
        document.body.appendChild(bar);

        // Entradas: títulos palabra a palabra y elementos escalonados
        if (!REDUCE) {
            document.querySelectorAll('.section-title, .cta-box h2').forEach(function (h) { h.classList.add('split'); splitWords(h, 'w'); });
            ['.apps-grid > *', '.bento > *', '.steps > li', '.tech-row > *', '.faq > details', '.about-text > p', '.cta-box > p, .feedback-form > *'].forEach(function (sel) {
                document.querySelectorAll(sel).forEach(function (el, i) { el.classList.add('stg'); el.style.setProperty('--i', i); });
            });
        }

        var items = document.querySelectorAll('.reveal');
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
                });
            }, { threshold: 0.12 });
            items.forEach(function (el) { io.observe(el); });
        } else items.forEach(function (el) { el.classList.add('visible'); });

        // Texto de "Sobre nosotros" que se ilumina palabra a palabra según avanzas
        var aboutWords = [];
        if (!REDUCE) document.querySelectorAll('.about-text p').forEach(function (p) {
            aboutWords = aboutWords.concat(Array.prototype.slice.call(splitWords(p, 'aw')));
        });
        var aboutBox = document.querySelector('.about-text'), steps = document.querySelector('.steps'), litCount = -1;
        var stepItems = steps ? Array.prototype.slice.call(steps.children) : [];

        function onScroll() {
            var sy = window.scrollY, H = window.innerHeight, max = document.documentElement.scrollHeight - H;
            bar.style.transform = 'scaleX(' + (max > 0 ? sy / max : 0) + ')';
            if (aboutBox && aboutWords.length) {
                var r = aboutBox.getBoundingClientRect();
                var p = clamp((H * 0.8 - r.top) / (r.height + H * 0.3), 0, 1), n = Math.round(p * aboutWords.length);
                if (n !== litCount) { litCount = n; aboutWords.forEach(function (w, i) { w.classList.toggle('lit', i < n); }); }
            }
            if (stepItems.length) { // la línea de cada paso se dibuja según avanzas
                var rs = steps.getBoundingClientRect(), pAll = clamp((H * 0.85 - rs.top) / (H * 0.45), 0, 1);
                var inRow = stepItems[stepItems.length - 1].offsetTop === stepItems[0].offsetTop;
                stepItems.forEach(function (li, i) {
                    var f = inRow ? pAll * stepItems.length - i : (H * 0.85 - li.getBoundingClientRect().top) / (H * 0.3);
                    li.style.setProperty('--f', clamp(f, 0, 1).toFixed(3));
                });
            }
        }
        var ticking = false;
        window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; onScroll(); }); }
        }, { passive: true });
        window.addEventListener('resize', onScroll);
        onScroll();

        if (REDUCE || !FINE) return;
        // Botones principales "magnéticos": siguen un poco al cursor
        document.querySelectorAll('.btn-primary').forEach(function (b) {
            b.addEventListener('pointermove', function (e) {
                var r = b.getBoundingClientRect();
                b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1) + 'px)';
            });
            b.addEventListener('pointerleave', function () { b.style.transform = ''; });
        });
        // Tarjetas que se inclinan hacia el cursor
        document.querySelectorAll('.card, .app-card').forEach(function (c) {
            c.classList.add('tilt');
            var timer;
            c.addEventListener('pointerenter', function () { clearTimeout(timer); c.classList.add('hovering'); });
            c.addEventListener('pointermove', function (e) {
                var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
                c.style.transform = 'perspective(900px) rotateX(' + (-y * 5).toFixed(2) + 'deg) rotateY(' + (x * 6).toFixed(2) + 'deg) translateY(-2px)';
            });
            c.addEventListener('pointerleave', function () { c.style.transform = ''; timer = setTimeout(function () { c.classList.remove('hovering'); }, 450); });
        });
    }


    // ---------- Formulario de sugerencias y problemas ----------
    // La web es estática: el formulario prepara un correo con los datos y abre la app de correo del usuario.
    function initFeedback() {
        var form = document.getElementById('feedbackForm');
        if (!form) return;
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var f = form.elements, msg = f.mensaje.value.trim();
            if (!msg) { f.mensaje.focus(); return; }
            var tipo = form.querySelector('input[name="tipo"]:checked').value, app = f.app.value, disp = f.dispositivo.value.trim();
            var subject = '[' + app + '] ' + tipo;
            var body = 'Tipo: ' + tipo + '\nApp: ' + app + (disp ? '\nDispositivo: ' + disp : '') + '\n\n' + msg + '\n';
            window.location.href = 'mailto:aevloop.dev@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        renderIcons();
        initParticles();
        initToc();
        initScrollFx();
        initFeedback();
    });
})();
