// Lógica compartida: iconos, animaciones de entrada, índice de las páginas legales
// y fondo de constelación de partículas. La web es solo de tema oscuro.
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

    // ---------- Fondo: constelación de triángulos (canvas) ----------
    // Una nube orgánica de pequeños triángulos de colores que gira despacio junto al titular
    // (solo en páginas con .hero), y partículas sueltas que flotan por toda la página.
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
        var W = 0, H = 0, dpr = 1, scrollY = window.scrollY || 0, lastFrame = 0;
        var cloud = { x: 0, y: 0, r: 0 }, mx = 0, my = 0, tx = 0, ty = 0;

        // Paleta: violeta dominante, con ámbar, verde azulado, magenta y azul como chispas
        var COLORS = ['128,82,255', '128,82,255', '128,82,255', '180,156,255', '255,184,41', '43,196,164', '224,75,214', '79,123,255'];
        function rand(a, b) { return a + Math.random() * (b - a); }
        function pick() { return COLORS[(Math.random() * COLORS.length) | 0]; }

        // Puntos repartidos sobre una esfera (Fibonacci) y deformados para que la forma sea orgánica
        var N = small ? 700 : 1500, pts = [], i;
        var GA = Math.PI * (3 - Math.sqrt(5));
        for (i = 0; i < N; i++) {
            var y = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), th = GA * i;
            var x = Math.cos(th) * rr, z = Math.sin(th) * rr;
            var bump = 1 + 0.2 * Math.sin(2.6 * x + 1) * Math.cos(3 * y) + 0.1 * Math.sin(4 * z + 2 * x)
                - (y > 0 ? 0.16 * y * Math.exp(-x * x * 26) : 0); // pliegue central: forma de dos lóbulos
            var q = Math.random(), depth = q < 0.1 ? rand(1.08, 1.5) : 1 - Math.pow(Math.random(), 2) * 0.55; // halo exterior y relleno interior
            pts.push({ x: x * bump * depth * 1.08, y: y * bump * depth * 0.9, z: z * bump * depth,
                c: pick(), s: rand(1.8, 3.8), a: rand(0, 6.28), spin: rand(-1, 1) * 0.0006, tw: rand(0, 6.28) });
        }
        // Partículas sueltas por toda la pantalla
        var DUST = small ? 26 : 60, dust = [];
        for (i = 0; i < DUST; i++) {
            dust.push({ x: Math.random(), y: Math.random(), vx: rand(-1, 1) * 0.000006, vy: rand(-1, 1) * 0.000006,
                c: pick(), s: rand(1.6, 3.4), a: rand(0, 6.28), spin: rand(-1, 1) * 0.0004, o: rand(0.12, 0.34) });
        }

        function tri(x, y, s, ang) {
            ctx.moveTo(x + Math.cos(ang) * s, y + Math.sin(ang) * s);
            ctx.lineTo(x + Math.cos(ang + 2.094) * s, y + Math.sin(ang + 2.094) * s);
            ctx.lineTo(x + Math.cos(ang + 4.189) * s, y + Math.sin(ang + 4.189) * s);
            ctx.closePath();
        }

        function measure() {
            var sy = window.scrollY || 0;
            if (!hero) { cloud.r = 0; return; }
            var vr = visual && visual.getBoundingClientRect();
            if (vr && vr.width > 40) { // escritorio: a la derecha del titular
                cloud.x = vr.left + vr.width / 2;
                cloud.y = vr.top + sy + vr.height / 2;
                cloud.r = Math.min(vr.width * 0.5, vr.height * 0.48, 340);
            } else { // móvil: debajo del texto
                var hr = hero.getBoundingClientRect();
                var pad = parseFloat(getComputedStyle(hero).paddingBottom) || 300;
                cloud.r = Math.min(W * 0.3, pad * 0.36);
                cloud.x = W / 2;
                cloud.y = hr.bottom + sy - pad / 2;
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
            var t = reduce ? 0 : now;

            // Partículas sueltas
            dust.forEach(function (d) {
                var x = ((d.x + d.vx * t) % 1 + 1) % 1 * W, y = ((d.y + d.vy * t) % 1 + 1) % 1 * H;
                ctx.strokeStyle = 'rgba(' + d.c + ',' + d.o + ')';
                ctx.beginPath(); tri(x, y, d.s, d.a + d.spin * t); ctx.stroke();
            });

            // Nube principal
            if (!cloud.r) return;
            var cy = cloud.y - scrollY;
            if (cy + cloud.r * 1.5 < 0 || cy - cloud.r * 1.5 > H) return;
            var rot = t * 0.00008 + tx * 0.5, tilt = 0.32 + ty * 0.25;
            var cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tilt), st = Math.sin(tilt);
            var R = cloud.r, F = 3.2; // F: distancia de cámara para una perspectiva suave
            for (var k = 0; k < pts.length; k++) {
                var p = pts[k];
                var x1 = p.x * cr + p.z * sr, z1 = -p.x * sr + p.z * cr;
                var y1 = p.y * ct - z1 * st, z2 = p.y * st + z1 * ct;
                var persp = F / (F - z2);
                var px = cloud.x + x1 * R * persp, py = cy + y1 * R * persp;
                var front = (z2 + 1.15) / 2.3; // 0 detrás, 1 delante
                var alpha = 0.18 + 0.82 * front * front;
                if (!reduce) alpha *= 0.8 + 0.2 * Math.sin(t * 0.0015 + p.tw);
                ctx.strokeStyle = 'rgba(' + p.c + ',' + alpha.toFixed(3) + ')';
                ctx.beginPath(); tri(px, py, p.s * (0.7 + 0.5 * front) * persp, p.a + p.spin * t); ctx.stroke();
            }
        }

        function loop(now) {
            requestAnimationFrame(loop);
            if (document.hidden) return;
            if (small && now - lastFrame < 33) return;
            lastFrame = now;
            tx += (mx - tx) * 0.04; ty += (my - ty) * 0.04;
            draw(now);
        }

        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('load', resize);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
        window.addEventListener('scroll', function () { scrollY = window.scrollY; if (reduce) draw(0); }, { passive: true });
        if (!reduce) {
            window.addEventListener('mousemove', function (e) { mx = e.clientX / W - 0.5; my = e.clientY / H - 0.5; }, { passive: true });
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
