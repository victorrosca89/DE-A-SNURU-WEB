(() => {
  const $ = (s) => document.querySelector(s);
  const mapEl = $('#heroMap');
  const info = $('#mapInfo');
  const CITY_CENTER = [47.5037123, 28.3650351]; // Telenești town centre, Moldova
  const players = [
    {id:'hider-01',name:'Hider 01',role:'Hider',kind:'hider',lat:47.5050,lng:28.3627,detail:'Participant ascuns. Poziție simulată pentru prezentarea interfeței.'},
    {id:'hider-02',name:'Hider 02',role:'Hider',kind:'hider',lat:47.5015,lng:28.3658,detail:'Participant ascuns. Poziție simulată pentru prezentarea interfeței.'},
    {id:'hider-03',name:'Hider 03',role:'Hider',kind:'hider',lat:47.5046,lng:28.3690,detail:'Participant ascuns. Poziție simulată pentru prezentarea interfeței.'},
    {id:'seeker-01',name:'Seeker 01',role:'Seeker',kind:'seeker',lat:47.5070,lng:28.3662,detail:'Căutător. Poziție simulată pentru prezentarea interfeței.'},
    {id:'seeker-02',name:'Seeker 02',role:'Seeker',kind:'seeker',lat:47.4999,lng:28.3618,detail:'Căutător. Poziție simulată pentru prezentarea interfeței.'},
    {id:'spectator-01',name:'Spectator 01',role:'Spectator',kind:'spectator',lat:47.5033,lng:28.3579,detail:'Urmărește partida. Poziție simulată pentru prezentarea interfeței.'}
  ];
  let map = null;

  function showPlayer(player) {
    $('#mapInfoTitle').textContent = `${player.name} · ${player.role}`;
    $('#mapInfoText').textContent = player.detail;
    info.classList.add('visible');
  }
  function markerIcon(player) {
    return L.divIcon({
      className: '',
      html: `<div class="map-pin ${player.kind}" role="img" aria-label="${player.role}"><span class="pin-ring"></span><span class="pin-core"></span></div>`,
      iconSize: [28,28], iconAnchor: [14,14],
      tooltipAnchor: [0,-13]
    });
  }

  if (window.L && mapEl) {
    map = L.map(mapEl, {
      zoomControl:false, attributionControl:true, scrollWheelZoom:false,
      dragging:true, zoomSnap:.5, minZoom:13, maxZoom:18
    }).setView(CITY_CENTER, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:19, attribution:'&copy; OpenStreetMap contributors'
    }).addTo(map);

    const markerBounds = [];
    players.forEach((player) => {
      const marker = L.marker([player.lat, player.lng], {
        icon:markerIcon(player), keyboard:true, title:`${player.name} — ${player.role}`
      }).addTo(map);
      marker.bindTooltip(player.name, {direction:'top', offset:[0,-7], className:'player-tooltip', opacity:.96});
      marker.on('click', () => showPlayer(player));
      markerBounds.push([player.lat, player.lng]);
    });
    map.fitBounds(markerBounds, {padding:[70,70], maxZoom:15.5, animate:false});
    $('#zoomIn').addEventListener('click', () => map.zoomIn());
    $('#zoomOut').addEventListener('click', () => map.zoomOut());
    $('#resetMap').addEventListener('click', () => map.flyToBounds(markerBounds, {padding:[70,70], maxZoom:15.5, duration:.8}));
    window.addEventListener('resize', () => map.invalidateSize());
    setTimeout(() => map.invalidateSize(), 250);
  } else if (mapEl) {
    mapEl.innerHTML = '<div style="height:100%;display:grid;place-items:center;color:#aaa;font-size:12px">Harta nu este disponibilă momentan. Verifică conexiunea la internet.</div>';
  }
  $('#mapInfoClose')?.addEventListener('click', () => info.classList.remove('visible'));

  // Parallax discret al hărții și tilt pentru cardurile de rol.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && window.matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const r = card.getBoundingClientRect();
        const x = (event.clientX-r.left)/r.width-.5;
        const y = (event.clientY-r.top)/r.height-.5;
        card.style.transform = `perspective(800px) rotateY(${x*5}deg) rotateX(${-y*5}deg) translateZ(5px)`;
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

  // Navigare mobilă.
  const menu = $('#menuToggle'), nav = $('.desktop-nav');
  menu?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open'); menu.setAttribute('aria-expanded','false');
  }));

  // PWA: afișează promptul nativ doar atunci când browserul îl oferă.
  let installPrompt = null;
  const modal = $('#installModal');
  const message = $('#installMessage');
  const action = $('#modalAction');
  function openInstallHelp(text, buttonText='Am înțeles') {
    if (!modal || !message || !action) return;
    message.textContent = text;
    action.textContent = buttonText;
    modal.hidden = false;
  }
  function closeInstallHelp() { if (modal) modal.hidden = true; }
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); installPrompt = event;
    const label = $('#installLabel'); if (label) label.textContent = 'Instalează aplicația';
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    const label = $('#installLabel'); if (label) label.textContent = 'Aplicație instalată';
    openInstallHelp('DE-A ȘNURU a fost instalată cu succes pe dispozitiv.');
  });
  async function installApp() {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      openInstallHelp('Aplicația este deja instalată pe acest dispozitiv.'); return;
    }
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      installPrompt = null;
      if (result && result.outcome === 'accepted') {
        const label = $('#installLabel'); if (label) label.textContent = 'Instalare solicitată';
      }
      return;
    }
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = isIOS || (/safari/i.test(navigator.userAgent) && !/chrome|android/i.test(navigator.userAgent));
    if (isIOS) openInstallHelp('Pe iPhone sau iPad: apasă butonul Partajare din Safari, apoi „Adaugă la ecranul principal”.');
    else if (isSafari) openInstallHelp('Acest browser nu oferă promptul automat de instalare. Folosește opțiunea „Add to Dock” sau „Add to Home Screen”, dacă este disponibilă.');
    else openInstallHelp('Instalarea nu este disponibilă în acest moment. Deschide pagina în Chrome sau Edge, verifică meniul browserului și caută opțiunea „Instalează aplicația”. Pagina trebuie servită prin HTTPS.');
  }
  $('#installBtn')?.addEventListener('click', installApp);
  $('#installBtnBottom')?.addEventListener('click', installApp);
  $('#modalClose')?.addEventListener('click', closeInstallHelp);
  action?.addEventListener('click', closeInstallHelp);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeInstallHelp(); });

  if ('serviceWorker' in navigator && !window.Capacitor && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();