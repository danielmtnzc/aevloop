// Lógica compartida: tema claro/oscuro, iconos, animaciones de entrada, luz en tarjetas,
// índice de las páginas legales y fondo de globo.
// El tema inicial se aplica con un script inline en <head> para evitar parpadeos.
(function () {
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem('theme', theme); } catch (e) {}
    }

    // ---------- Iconos propios (trazos tipo Lucide, sin dependencias externas) ----------
    var ICONS = {
        moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
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

    // ---------- Luz que sigue al cursor en tarjetas (.spot) ----------
    function initSpotlight() {
        document.addEventListener('pointermove', function (e) {
            var el = e.target.closest && e.target.closest('.spot');
            if (!el) return;
            var r = el.getBoundingClientRect();
            el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
            el.style.setProperty('--my', (e.clientY - r.top) + 'px');
        }, { passive: true });
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

    // ---------- Fondo: globo de malla (canvas) ----------
    function initGlobe() {
        var canvas = document.createElement('canvas');
        canvas.id = 'bg-globe';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(canvas, document.body.firstChild);
        var ctx = canvas.getContext('2d');
        if (!ctx) return;

        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var off = document.createElement('canvas'), octx = off.getContext('2d');
        var W = 0, H = 0, dpr = 1, R = 0, scrollY = window.scrollY || 0;
        var heroEnd = 0, mx = 0, my = 0, tx = 0, ty = 0, lineRgb = '255,255,255', glowRgb = '129,140,248';
        var small = Math.min(window.innerWidth, window.innerHeight) < 700 || (navigator.hardwareConcurrency || 8) <= 4; // menos malla y 30 fps
        var LAT_STEP = small ? 15 : 10, LON_STEP = small ? 15 : 10, lastFrame = 0, TILT = -0.16; // se ve desde ligeramente por debajo del polo
        var D = Math.PI / 180;
        // Arcos de luz entre puntos de la esfera: [lat, lon] → [lat, lon]
        var ARCS = [[[38, -45], [18, 55]], [[12, 105], [48, 165]], [[-10, -105], [28, -15]], [[52, 20], [8, 80]]];

        function readColors() {
            var cs = getComputedStyle(document.documentElement);
            lineRgb = cs.getPropertyValue('--globe-rgb').trim() || lineRgb;
            glowRgb = cs.getPropertyValue('--globe-glow-rgb').trim() || glowRgb;
        }

        function resize() {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = window.innerWidth; H = window.innerHeight;
            [canvas, off].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
            canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
            R = Math.min(Math.max(W * 0.9, 420), 1300);
            var act = document.querySelector('.hero-trust') || document.querySelector('.hero-actions');
            heroEnd = act ? act.getBoundingClientRect().bottom + (window.scrollY || 0) + 24 : 0;
            draw(performance.now());
        }

        // Proyecta un punto (lat, lon) a pantalla; k sube el punto sobre la superficie. null si queda detrás.
        function project(lat, lon, rot, tilt, cx, cy, k) {
            k = k || 1;
            var cl = Math.cos(lat), x = cl * Math.sin(lon + rot), y = Math.sin(lat), z = cl * Math.cos(lon + rot);
            var y2 = y * Math.cos(tilt) - z * Math.sin(tilt), z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
            if (z2 < 0) return null;
            return [cx + x * R * k, cy - y2 * R * k];
        }

        function strokeLine(c, pts) {
            var open = false;
            c.beginPath();
            pts.forEach(function (p) {
                if (!p) { open = false; return; }
                if (!open) { c.moveTo(p[0], p[1]); open = true; } else { c.lineTo(p[0], p[1]); }
            });
            c.stroke();
        }

        // Punto del círculo máximo entre a y b (vectores unitarios) en t∈[0,1], devuelto como [lat, lon]
        function slerp(a, b, om, t) {
            var s = Math.sin(om), f1 = Math.sin((1 - t) * om) / s, f2 = Math.sin(t * om) / s;
            var x = f1 * a[0] + f2 * b[0], y = f1 * a[1] + f2 * b[1], z = f1 * a[2] + f2 * b[2];
            return [Math.asin(Math.max(-1, Math.min(1, y))), Math.atan2(x, z)];
        }
        function vec(latDeg, lonDeg) {
            var la = latDeg * D, lo = lonDeg * D;
            return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
        }

        function draw(now) {
            if (!W || !H || !off.width || !off.height) return;
            var top = Math.max(H * 0.66, heroEnd) - scrollY * 0.25, cx = W / 2, cy = top + R;
            var rot = reduce ? 0.4 : now * 0.00004 + tx * 0.25, tilt = TILT + ty * 0.06;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, W, H);
            // Resplandor suave sobre el vértice del globo
            var g = ctx.createRadialGradient(cx, top, 0, cx, top, Math.max(W, R) * 0.7);
            g.addColorStop(0, 'rgba(' + glowRgb + ',0.20)');
            g.addColorStop(1, 'rgba(' + glowRgb + ',0)');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

            // Malla en un canvas aparte para poder desvanecerla hacia abajo y hacia los lados
            octx.setTransform(dpr, 0, 0, dpr, 0, 0);
            octx.clearRect(0, 0, W, H);
            octx.lineWidth = 1;
            var i, j, pts, lat, lon;
            octx.strokeStyle = 'rgba(' + lineRgb + ',0.5)';
            for (i = 0; i < 360; i += LON_STEP) { // meridianos
                pts = [];
                for (j = -90; j <= 90; j += 3) pts.push(project(j * D, i * D, rot, tilt, cx, cy));
                strokeLine(octx, pts);
            }
            octx.strokeStyle = 'rgba(' + lineRgb + ',0.38)';
            for (lat = -80; lat <= 80; lat += LAT_STEP) { // paralelos
                pts = [];
                for (lon = 0; lon <= 360; lon += 4) pts.push(project(lat * D, lon * D, rot, tilt, cx, cy));
                strokeLine(octx, pts);
            }
            // Máscara: más intensa arriba y al centro
            octx.globalCompositeOperation = 'destination-in';
            var m = octx.createLinearGradient(0, top - 20, 0, top + H * 0.6);
            m.addColorStop(0, 'rgba(0,0,0,0.9)'); m.addColorStop(1, 'rgba(0,0,0,0.08)');
            octx.fillStyle = m; octx.fillRect(0, 0, W, H);
            var s = octx.createRadialGradient(cx, top, 0, cx, top, Math.max(W * 0.75, 500));
            s.addColorStop(0, 'rgba(0,0,0,1)'); s.addColorStop(1, 'rgba(0,0,0,0.25)');
            octx.fillStyle = s; octx.fillRect(0, 0, W, H);
            octx.globalCompositeOperation = 'source-over';
            ctx.drawImage(off, 0, 0, W, H);

            function fade(y) { return Math.max(0.12, Math.min(1, 1 - (y - top) / (H * 0.6))); }

            // Nodos luminosos en algunos cruces de la malla
            var idx = 0, p, a;
            for (lat = -60; lat <= 60; lat += 30) {
                for (lon = 0; lon < 360; lon += 30) {
                    idx++;
                    if ((idx * 7919) % 10 > 2) continue;
                    p = project(lat * D, lon * D, rot, tilt, cx, cy);
                    if (!p) continue;
                    a = fade(p[1]) * (reduce ? 0.8 : 0.55 + 0.45 * Math.sin(now * 0.002 + idx));
                    ctx.fillStyle = 'rgba(' + glowRgb + ',' + (a * 0.18) + ')';
                    ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, 6.2832); ctx.fill();
                    ctx.fillStyle = 'rgba(' + glowRgb + ',' + a + ')';
                    ctx.beginPath(); ctx.arc(p[0], p[1], 1.8, 0, 6.2832); ctx.fill();
                }
            }

            // Arcos de luz sobre la superficie, con un destello que los recorre
            ctx.lineWidth = 1.2; ctx.lineCap = 'round';
            ARCS.forEach(function (arc, n) {
                var A = vec(arc[0][0], arc[0][1]), B = vec(arc[1][0], arc[1][1]);
                var om = Math.acos(Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])));
                function at(t) {
                    var ll = slerp(A, B, om, t);
                    return project(ll[0], ll[1], rot, tilt, cx, cy, 1 + 0.2 * Math.sin(Math.PI * t));
                }
                var prev = null, t, q;
                for (t = 0; t <= 1.001; t += 0.04) { // trazo tenue
                    q = at(t);
                    if (q && prev) {
                        ctx.strokeStyle = 'rgba(' + glowRgb + ',' + (0.22 * fade(q[1])) + ')';
                        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
                    }
                    prev = q;
                }
                if (reduce) return;
                var head = ((now * 0.00012 + n * 0.37) % 1.5) - 0.2, tail = 0.22, k;
                prev = null;
                for (k = 0; k <= 10; k++) { // cola brillante
                    t = head - tail + (tail * k) / 10;
                    if (t < 0 || t > 1) { prev = null; continue; }
                    q = at(t);
                    if (q && prev) {
                        ctx.strokeStyle = 'rgba(' + glowRgb + ',' + (0.9 * (k / 10) * fade(q[1])) + ')';
                        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
                    }
                    prev = q;
                }
            });
        }

        var running = false;
        function loop(now) {
            if (small && now - lastFrame < 33) { requestAnimationFrame(loop); return; }
            lastFrame = now;
            tx += (mx - tx) * 0.04; ty += (my - ty) * 0.04;
            draw(now);
            requestAnimationFrame(loop);
        }

        readColors();
        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('load', resize);
        window.addEventListener('scroll', function () { scrollY = window.scrollY; if (reduce) draw(0); }, { passive: true });
        new MutationObserver(function () { readColors(); draw(performance.now()); })
            .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        if (!reduce) {
            window.addEventListener('mousemove', function (e) {
                mx = e.clientX / W - 0.5; my = e.clientY / H - 0.5;
            }, { passive: true });
            if (!running) { running = true; requestAnimationFrame(loop); }
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        renderIcons();
        initGlobe();
        initSpotlight();
        initToc();

        document.querySelectorAll('.theme-toggle').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var current = document.documentElement.getAttribute('data-theme');
                setTheme(current === 'light' ? 'dark' : 'light');
            });
        });

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
