/* ===================================================================
   Galeri: scroll tak berujung (loop), titik & panah selalu sinkron
   dengan posisi scroll manual — tanpa harus klik panah dulu.
=================================================================== */
(function () {
  const track = document.getElementById('galleryTrack');
  if (!track) return;

  const originals = Array.from(track.children);
  const total = originals.length;
  const dots = Array.from(document.querySelectorAll('#galleryDots a'));
  const prevBtn = document.getElementById('galPrev');
  const nextBtn = document.getElementById('galNext');

  // Gandakan slide asli: [salinan] + [asli] + [salinan]
  // supaya bisa scroll bebas ke kiri/kanan tanpa pernah mentok ujung.
  function buildClone() {
    return originals.map((s) => {
      const c = s.cloneNode(true);
      c.removeAttribute('id');
      c.setAttribute('aria-hidden', 'true');
      c.setAttribute('tabindex', '-1');
      return c;
    });
  }

  const before = buildClone();
  const after = buildClone();
  track.innerHTML = '';
  before.forEach((n) => track.appendChild(n));
  originals.forEach((n) => track.appendChild(n));
  after.forEach((n) => track.appendChild(n));

  const allSlides = Array.from(track.children); // 3 x total

  // Lebar langkah (slide + gap) disimpan di cache, cuma dihitung ulang
  // saat resize — bukan tiap frame — supaya loop pemeriksaan di bawah
  // ringan dan tidak pernah telat mengoreksi posisi.
  let step = 1;
  function measureStep() {
    const a = allSlides[0].getBoundingClientRect();
    const b = allSlides[1].getBoundingClientRect();
    step = b.left - a.left || 1; // lebar slide + gap
  }
  measureStep();

  function absIndexFromScroll() {
    return Math.round(track.scrollLeft / step);
  }

  function goTo(absIndex, smooth) {
    track.scrollTo({ left: absIndex * step, behavior: smooth ? 'smooth' : 'auto' });
  }

  function setActiveDot(realIndex) {
    dots.forEach((d, i) => d.classList.toggle('active', i === realIndex));
  }

  // Mulai di awal kelompok tengah (salinan asli), tanpa animasi.
  goTo(total, false);
  setActiveDot(0);

  // Loop pemeriksaan berjalan tiap frame (bukan menunggu event 'scroll'),
  // supaya posisi selalu dikoreksi SEBELUM benar-benar mentok di ujung
  // asli DOM — baik saat discroll manual (scroll/trackpad/sentuh) maupun
  // saat digeser lewat panah. Dengan begitu tidak akan pernah terasa
  // ada "ujung" sama sekali, baik ke kiri maupun ke kanan.
  //
  // Batas kanan yang sebenarnya (scrollWidth - clientWidth) lebih kecil
  // dari "abs terakhir x step" karena beberapa slide tampil sekaligus
  // di viewport — jadi batas kanan dihitung dinamis, bukan angka tetap,
  // supaya koreksi tetap terjadi sebelum benar-benar mentok.
  function correctLoop() {
    let abs = absIndexFromScroll();
    const maxAbs = (track.scrollWidth - track.clientWidth) / step;

    if (abs <= total * 0.5) {
      abs += total;
      goTo(abs, false);
    } else if (abs >= maxAbs - total * 0.5) {
      abs -= total;
      goTo(abs, false);
    }

    const real = ((abs % total) + total) % total;
    setActiveDot(real);
    requestAnimationFrame(correctLoop);
  }
  requestAnimationFrame(correctLoop);

  prevBtn && prevBtn.addEventListener('click', () => {
    goTo(absIndexFromScroll() - 1, true);
  });
  nextBtn && nextBtn.addEventListener('click', () => {
    goTo(absIndexFromScroll() + 1, true);
  });

  dots.forEach((d, i) => {
    d.addEventListener('click', (e) => {
      e.preventDefault();
      const abs = absIndexFromScroll();
      const real = ((abs % total) + total) % total;
      goTo(abs + (i - real), true);
    });
  });

  window.addEventListener('resize', measureStep);

  // ===== Autoplay: galeri berganti foto sendiri secara berkala =====
  // Berhenti sebentar begitu pengguna berinteraksi (scroll manual,
  // sentuh, atau klik panah/titik), lalu lanjut otomatis lagi setelah
  // beberapa saat tidak ada aktivitas.
  const AUTOPLAY_DELAY = 3500; // jeda antar foto (ms)
  const RESUME_DELAY = 3000;   // jeda sebelum lanjut lagi setelah disentuh (ms)
  let pausedUntil = 0;

  function pauseAutoplay(ms) {
    pausedUntil = Date.now() + ms;
  }

  setInterval(() => {
    if (document.hidden || Date.now() < pausedUntil) return;
    goTo(absIndexFromScroll() + 1, true);
  }, AUTOPLAY_DELAY);

  ['pointerdown', 'touchstart', 'wheel'].forEach((evt) => {
    track.addEventListener(evt, () => pauseAutoplay(AUTOPLAY_DELAY + RESUME_DELAY), { passive: true });
  });
  ['pointerup', 'touchend'].forEach((evt) => {
    track.addEventListener(evt, () => pauseAutoplay(RESUME_DELAY), { passive: true });
  });
  [prevBtn, nextBtn, ...dots].forEach((el) => {
    el && el.addEventListener('click', () => pauseAutoplay(RESUME_DELAY));
  });
})();

/* ===================================================================
   Navigasi: menu (header & footer) otomatis menyala mengikuti
   bagian yang sedang terlihat saat discroll manual — bukan cuma
   saat linknya diklik.
=================================================================== */
(function () {
  const sectionIds = ['galeri', 'menu', 'kenapa', 'lokasi', 'kontak'];
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const navLinks = Array.from(
    document.querySelectorAll('.nav-links a[href^="#"], .foot-grid a[href^="#"]')
  );

  function setActive(id) {
    navLinks.forEach((a) => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + id);
    });
  }

  if (!('IntersectionObserver' in window) || sections.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );

  sections.forEach((s) => observer.observe(s));
})();