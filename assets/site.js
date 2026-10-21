// Lógica compartida: iconos, animaciones de entrada, índice de las páginas legales
// y fondo de partículas (móvil animado junto al titular). La web es solo de tema oscuro.
(function () {
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

    // ---------- Fondo: móvil de partículas (canvas) ----------
    // Junto al titular (páginas con .hero) se dibuja un teléfono formado por pequeños triángulos de colores:
    // se monta al cargar, flota y gira en 3D, enciende sus iconos, se aparta del cursor y se deshace al hacer scroll.
    // Por toda la página flotan además partículas sueltas.
    function initConstellation() {
        var canvas = document.createElement('canvas');
        canvas.id = 'bg-constellation';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(canvas, document.body.firstChild);
        var ctx = canvas.getContext('2d');
        if (!ctx) return;

        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var small = Math.min(window.innerWidth, window.innerHeight) < 700 || (navigator.hardwareConcurrency || 8) <= 4;
        var hero = document.querySelector('.hero'), visual = document.querySelector('.hero-visual');
        var W = 0, H = 0, dpr = 1, scrollY = window.scrollY || 0, lastFrame = 0, t0 = performance.now();
        var phone = { x: 0, y: 0, s: 0, h: 1 }, mx = 0, my = 0, tx = 0, ty = 0, px = -9999, py = -9999;

        var VIOLET = '128,82,255', LAVENDER = '180,156,255', AMBER = '255,184,41', TEAL = '43,196,164',
            MAGENTA = '224,75,214', BLUE = '79,123,255', WHITE = '235,235,245';
        var ICON_COLORS = [VIOLET, AMBER, TEAL, MAGENTA, BLUE, LAVENDER];
        function rand(a, b) { return a + Math.random() * (b - a); }

        // ----- Forma del teléfono (coordenadas locales: ancho 1, alto 2.05, grosor 0.14) -----
        var PW = 1, PH = 2.05, D = 0.07, dens = small ? 0.55 : 1, pts = [];
        function add(x, y, z, c, kind, icon) {
            var dir = [rand(-1, 1), rand(-1, 1), rand(-1, 1)], l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
            pts.push({ hx: x, hy: y, hz: z, c: c, kind: kind || 0, icon: icon == null ? -1 : icon,
                dx: dir[0] / l, dy: dir[1] / l, dz: dir[2] / l, far: rand(2.5, 5),
                delay: rand(0, 900), s: rand(1.3, 2.4), a: rand(0, 6.28), spin: rand(-1, 1) * 0.0008,
                ph: rand(0, 6.28), ox: 0, oy: 0 });
        }
        // Contorno de rectángulo redondeado con n puntos repartidos por igual
        function rrect(cx, cy, w, h, r, z, n, color, kind, icon) {
            var sw = w - 2 * r, sh = h - 2 * r, arc = Math.PI * r / 2, per = 2 * sw + 2 * sh + 4 * arc, i;
            for (i = 0; i < n; i++) {
                var d = (i / n) * per, x, y, a;
                if (d < sw) { x = -sw / 2 + d; y = h / 2; }
                else if ((d -= sw) < arc) { a = d / r; x = sw / 2 + Math.sin(a) * r; y = sh / 2 + Math.cos(a) * r; }
                else if ((d -= arc) < sh) { x = w / 2; y = sh / 2 - d; }
                else if ((d -= sh) < arc) { a = d / r; x = sw / 2 + Math.cos(a) * r; y = -sh / 2 - Math.sin(a) * r; }
                else if ((d -= arc) < sw) { x = sw / 2 - d; y = -h / 2; }
                else if ((d -= sw) < arc) { a = d / r; x = -sw / 2 - Math.sin(a) * r; y = -sh / 2 - Math.cos(a) * r; }
                else if ((d -= arc) < sh) { x = -w / 2; y = -sh / 2 + d; }
                else { d -= sh; a = d / r; x = -sw / 2 - Math.cos(a) * r; y = sh / 2 + Math.sin(a) * r; }
                add(cx + x, cy + y, z, typeof color === 'function' ? color() : color, kind, icon);
            }
        }
        function circle(cx, cy, r, z, n, color) {
            for (var i = 0; i < n; i++) { var a = (i / n) * 6.2832; add(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z, color); }
        }
        function N(n) { return Math.max(6, Math.round(n * dens)); }
        var frame = function () { return Math.random() < 0.7 ? VIOLET : LAVENDER; };
        rrect(0, 0, PW, PH, 0.17, D, N(300), frame);                 // cara frontal
        rrect(0, 0, PW, PH, 0.17, -D, N(220), frame);                // cara trasera
        rrect(0, 0, PW, PH, 0.17, 0, N(140), frame);                 // canto
        rrect(0, 0, PW - 0.08, PH - 0.08, 0.13, D, N(190), function () { return Math.random() < 0.5 ? LAVENDER : BLUE; }); // borde de pantalla
        rrect(0, PH / 2 - 0.12, 0.27, 0.075, 0.037, D, N(30), WHITE); // isla de la cámara frontal
        add(0.62 * PW / 2 + 0.18, 0.55, 0, LAVENDER); add(-PW / 2 - 0.004, 0.55, 0, LAVENDER); // botones laterales
        // Iconos de apps: rejilla 4 × 5 y dock
        var ic = 0, col, row, IS = 0.165, GX = 0.215, GY = 0.25;
        for (row = 0; row < 5; row++) for (col = 0; col < 4; col++) {
            rrect(-1.5 * GX + col * GX, 0.66 - row * GY, IS, IS, 0.05, D, N(30), ICON_COLORS[(ic * 5 + row) % ICON_COLORS.length], 1, ic); ic++;
        }
        rrect(0, -0.8, PW - 0.2, 0.22, 0.08, D, N(60), LAVENDER);   // dock
        for (col = 0; col < 4; col++) { rrect(-1.5 * GX + col * GX, -0.8, IS - 0.01, IS - 0.01, 0.047, D, N(26), ICON_COLORS[(col + 2) % ICON_COLORS.length], 1, ic); ic++; }
        var ICONS_TOTAL = ic;
        // Trasera: módulo de cámaras
        rrect(-0.22, 0.72, 0.4, 0.4, 0.1, -D, N(50), LAVENDER);
        circle(-0.31, 0.81, 0.07, -D, N(18), WHITE); circle(-0.13, 0.81, 0.07, -D, N(18), WHITE);
        circle(-0.31, 0.63, 0.07, -D, N(18), WHITE); circle(-0.13, 0.63, 0.04, -D, N(10), AMBER);
        // Destellos sueltos sobre la pantalla
        for (var k = 0; k < N(70); k++) add(rand(-0.42, 0.42), rand(-0.95, 0.95), D, Math.random() < 0.5 ? AMBER : TEAL, 2);

        // Partículas sueltas por toda la pantalla
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
        function ease(x) { return x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3); }
        function easeIO(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

        function measure() {
            var sy = window.scrollY || 0;
            if (!hero) { phone.s = 0; return; }
            var vr = visual && visual.getBoundingClientRect(), hr = hero.getBoundingClientRect();
            phone.h = Math.max(hr.height, 300);
            if (vr && vr.width > 40) { // escritorio: a la derecha del titular
                phone.x = vr.left + vr.width / 2;
                phone.y = vr.top + sy + vr.height / 2;
                phone.s = Math.min(vr.height * 0.74 / PH, vr.width * 0.62, 300);
            } else { // móvil: debajo del texto
                var pad = parseFloat(getComputedStyle(hero).paddingBottom) || 300;
                phone.s = Math.min(pad * 0.8 / PH, W * 0.42);
                phone.x = W / 2;
                phone.y = hr.bottom + sy - pad / 2;
            }
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

            if (!phone.s) return;
            var cyBase = phone.y - scrollY;
            var spread = Math.min(1, Math.max(0, scrollY / (phone.h * 0.85))); // se deshace al hacer scroll
            if (spread >= 1) return;
            var S = phone.s, cx = phone.x, cy = cyBase + (reduce ? 0 : Math.sin(t * 0.0011) * S * 0.04);

            // Giro: balanceo suave + una vuelta completa cada 13 s + seguimiento del ratón
            var rotY = -0.42 + (reduce ? 0 : Math.sin(t * 0.0004) * 0.38) + tx * 0.7;
            var cyc = (el % 13000) / 13000;
            if (!reduce && el > 4000 && cyc > 0.78) rotY += easeIO((cyc - 0.78) / 0.22) * 6.2832;
            var rotX = 0.1 + (reduce ? 0 : Math.sin(t * 0.0003) * 0.07) + ty * 0.35, rotZ = reduce ? 0.06 : 0.06 + Math.sin(t * 0.0005) * 0.04;
            var cY = Math.cos(rotY), sY = Math.sin(rotY), cX = Math.cos(rotX), sX = Math.sin(rotX), cZ = Math.cos(rotZ), sZ = Math.sin(rotZ);
            var lit = Math.floor(t / 420) % ICONS_TOTAL, lit2 = (lit + 7) % ICONS_TOTAL;   // iconos que se encienden
            var scan = 1.15 - ((t * 0.00045) % 2.6);                                     // franja de luz por la pantalla
            var F = 4, R2 = 110 * 110;

            for (var i = 0; i < pts.length; i++) {
                var p = pts[i];
                var asm = ease((el - p.delay) / 1700);                                    // montaje inicial
                var out = (1 - asm) * p.far + Math.pow(spread, 1.4) * p.far * 0.9;        // fuera de su sitio
                var wob = reduce ? 0 : 0.006;
                var x = p.hx + p.dx * out + Math.sin(t * 0.002 + p.ph) * wob;
                var y = p.hy + p.dy * out + Math.cos(t * 0.0017 + p.ph) * wob;
                var z = p.hz + p.dz * out;
                var x1 = x * cZ - y * sZ, y1 = x * sZ + y * cZ;                          // Z
                var x2 = x1 * cY + z * sY, z2 = -x1 * sY + z * cY;                        // Y
                var y3 = y1 * cX - z2 * sX, z3 = y1 * sX + z2 * cX;                       // X
                var persp = F / (F - z3);
                var sx = cx + x2 * S * persp, sy = cy - y3 * S * persp;

                // El cursor aparta las partículas
                var ddx = sx - px, ddy = sy - py, d2 = ddx * ddx + ddy * ddy, tox = 0, toy = 0;
                if (d2 < R2) { var dd = Math.sqrt(d2) || 1, f = (1 - dd / 110) * 34; tox = ddx / dd * f; toy = ddy / dd * f; }
                p.ox += (tox - p.ox) * 0.12; p.oy += (toy - p.oy) * 0.12;
                sx += p.ox; sy += p.oy;

                var front = Math.max(0, Math.min(1, (z3 + 0.6) / 1.2));
                var alpha = (0.12 + 0.88 * front * front) * (0.35 + 0.65 * asm) * (1 - spread);
                var size = p.s * persp;
                if (p.kind === 1) {
                    if (p.icon === lit || p.icon === lit2) { alpha = Math.min(1, alpha * 1.6); size *= 1.5; }
                    else alpha = Math.min(1, alpha * 1.15);
                    size *= 0.85;
                }
                if (p.kind === 2) alpha *= reduce ? 0.6 : 0.3 + 0.7 * Math.abs(Math.sin(t * 0.003 + p.ph));
                if (p.hz > 0 && Math.abs(p.hy - scan) < 0.07) { alpha = Math.min(1, alpha + 0.45); size *= 1.35; }
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
        window.addEventListener('scroll', function () { scrollY = window.scrollY; if (reduce) draw(0); }, { passive: true });
        if (!reduce) {
            window.addEventListener('pointermove', function (e) {
                mx = e.clientX / W - 0.5; my = e.clientY / H - 0.5; px = e.clientX; py = e.clientY;
            }, { passive: true });
            document.addEventListener('pointerleave', function () { px = py = -9999; });
            requestAnimationFrame(loop);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        renderIcons();
        initConstellation();
        initToc();

        var items = document.querySelectorAll('.reveal');
        if (!('IntersectionObserver' in window)) {
            items.forEach(function (el) { el.classList.add('visible'); });
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
            });
        }, { threshold: 0.12 });
        items.forEach(function (el) { io.observe(el); });
    });
})();
