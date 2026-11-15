(() => {
  const $ = (s) => document.querySelector(s);
  const mapEl = $('#heroMap');
  let map = null;
  const info = $('#mapInfo');
  const points = [
    {lat:47.0105,lng:28.8638,title:'Punct central',text:'Un reper demonstrativ pe harta interactivă. Nu reprezintă poziția unui jucător real.',tone:'red'},
    {lat:47.0178,lng:28.8502,title:'Zonă de explorare',text:'Punct de interes ilustrativ. Într-o partidă reală, harta poate afișa pozițiile participanților.',tone:'white'},
    {lat:47.0042,lng:28.8781,title:'Punct de observație',text:'Un al treilea reper demonstrativ pentru a explora harta și animațiile.',tone:'red'}
  ];

  function showPoint(p) {
    $('#mapInfoTitle').textContent = p.title;
    $('#mapInfoText').textContent = p.text;
    info.classList.add('visible');
  }
  function markerIcon(tone) {
    return L.divIcon({
      className: '',
      html: `<div class="map-pin ${tone === 'white' ? 'white' : ''}"><span class="pin-ring"></span><span class="pin-core"></span></div>`,
      iconSize: [22,22], iconAnchor: [11,11]
    });
  }
  if (window.L && mapEl) {
    map = L.map(mapEl, {zoomControl:false, attributionControl:true, scrollWheelZoom:false, dragging:true, zoomSnap:.5, minZoom:11, maxZoom:17}).setView([47.0105,28.8638],13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:19, attribution:'&copy; OpenStreetMap contributors'
    }).addTo(map);
    points.forEach((p) => {
      L.marker([p.lat,p.lng], {icon:markerIcon(p.tone), keyboard:true})
        .addTo(map).on('click', () => showPoint(p));
    });
    L.polyline(points.map(p => [p.lat,p.lng]), {color:'#ff5149',weight:1,opacity:.4,dashArray:'4 9'}).addTo(map);
    $('#zoomIn').addEventListener('click', () => map.zoomIn());
    $('#zoomOut').addEventListener('click', () => map.zoomOut());
    $('#resetMap').addEventListener('click', () => map.flyTo([47.0105,28.8638],13,{duration:.8}));
    window.addEventListener('resize', () => map.invalidateSize());
    setTimeout(() => map.invalidateSize(), 250);
  } else {
    mapEl.innerHTML = '<div style="height:100%;display:grid;place-items:center;color:#aaa;font-size:12px">Harta nu este disponibilă momentan. Verifică conexiunea la internet.</div>';
  }
  $('#mapInfoClose').addEventListener('click', () => info.classList.remove('visible'));

  // Tilt discret pentru elementele 3D. Oprit pe touch și pentru reduced motion.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('[data-tilt], .floating-card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const r = card.getBoundingClientRect();
        const x = (event.clientX-r.left)/r.width-.5;
        const y = (event.clientY-r.top)/r.height-.5;
        card.style.transform = `perspective(800px) rotateY(${x*9}deg) rotateX(${-y*9}deg) translateZ(8px)`;
      });
      card.addEventListener('pointerleave', () => card.style.transform = '');
    });
    const hero = $('.hero');
    hero.addEventListener('pointermove', (event) => {
      const r = hero.getBoundingClientRect();
      const x = (event.clientX-r.left)/r.width-.5;
      const y = (event.clientY-r.top)/r.height-.5;
      $('.hero-map-wrap').style.transform = `translate3d(${x*-7}px,${y*-5}px,0)`;
    });
    hero.addEventListener('pointerleave', () => $('.hero-map-wrap').style.transform = '');
  }

  // Navigare mobilă
  const menu = $('#menuToggle'), nav = $('.desktop-nav');
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open'); menu.setAttribute('aria-expanded','false');
  }));

  // PWA: folosește promptul nativ numai când browserul îl oferă.
  let installPrompt = null;
  const modal = $('#installModal');
  const message = $('#installMessage');
  const action = $('#modalAction');
  function openInstallHelp(text, buttonText='Am înțeles') {
    message.textContent = text;
    action.textContent = buttonText;
    modal.hidden = false;
  }
  function closeInstallHelp() { modal.hidden = true; }
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    $('#installLabel').textContent = 'Instalează aplicația';
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    $('#installLabel').textContent = 'Aplicație instalată';
    openInstallHelp('DE-A ȘNURU’ a fost instalată cu succes pe dispozitiv.');
  });
  async function installApp() {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      openInstallHelp('Aplicația este deja instalată pe acest dispozitiv.');
      return;
    }
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      installPrompt = null;
      if (result && result.outcome === 'accepted') {
        $('#installLabel').textContent = 'Instalare solicitată';
      }
      return;
    }
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = isIOS || (/safari/i.test(navigator.userAgent) && !/chrome|android/i.test(navigator.userAgent));
    if (isIOS) {
      openInstallHelp('Pe iPhone sau iPad: apasă butonul Partajare din Safari, apoi „Adaugă la ecranul principal”.');
    } else if (isSafari) {
      openInstallHelp('Acest browser nu oferă promptul automat de instalare. Folosește opțiunea „Add to Dock” sau „Add to Home Screen”, dacă este disponibilă.');
    } else {
      openInstallHelp('Instalarea nu este disponibilă în acest moment. Deschide pagina în Chrome sau Edge, verifică meniul browserului și caută opțiunea „Instalează aplicația”. Pagina trebuie servită prin HTTPS.');
    }
  }
  $('#installBtn').addEventListener('click', installApp);
  $('#installBtnBottom').addEventListener('click', installApp);
  $('#modalClose').addEventListener('click', closeInstallHelp);
  action.addEventListener('click', closeInstallHelp);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeInstallHelp(); });

  // Înregistrează același service worker al aplicației, fără să atingă fișierele existente.
  if ('serviceWorker' in navigator && !window.Capacitor && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();