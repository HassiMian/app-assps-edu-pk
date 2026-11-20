/* ASSPS A333 — app-wide route history and safe resume controller.
   Narrow, additive layer: does not change React Router, auth or draft persistence. */
(function () {
  'use strict';
  if (window.__ASSPS_A333_NAV__) return;
  window.__ASSPS_A333_NAV__ = {version: 'A333.1', installed: true};
  var KEY = 'assps.nav.a333.v1';
  var TTL = 8 * 60 * 60 * 1000;
  var MAX = 50;
  var ROUTES = {
    dashboard:'Dashboard', students:'Students', attendance:'Attendance',
    exams:'Examinations', examination:'Examinations', fees:'Fees',
    'paper-generator':'Paper Generator', 'question-bank':'Question Bank',
    timetable:'Timetable', datesheet:'Date Sheet', settings:'Settings',
    academic:'Academic Setup', 'academic-setup':'Academic Setup',
    employees:'Employees', transport:'Transport', library:'Library',
    messages:'Messages', parents:'Parents', 'parent-portal':'Parents',
    profile:'Profile', cards:'Cards', families:'Families', expenses:'Expenses',
    'ai-analytics':'Analytics', notifications:'Notifications',
    'school-documents':'School Documents', 'student-portal':'Student Portal',
    'id-cards':'ID Cards', 'admin':'Administration', 'student':'Student Portal'
  };
  var LABELS = {
    mark:'Mark Attendance', analytics:'Analytics', sms:'SMS Report',
    view:'View', create:'Create', reports:'Reports', settings:'Settings',
    marks:'Marks Entry', review:'Review', results:'Results',
    grades:'Grade Setup', admissions:'Admissions', promote:'Promotions',
    saved:'Saved Papers', build:'Paper Workspace', bank:'Question Bank',
    early_years:'Pre Classes Papers', diary:'Daily Diary', lesson:'Lesson Plans'
  };
  var EXACT = new Set(["/academic","/academic-setup","/admin/subscription-requests","/ai-analytics","/attendance","/attendance/analytics","/attendance/mark","/attendance/qr-scan","/attendance/sms","/cards","/dashboard","/datesheet","/employees","/examination","/examination/cards","/examination/manage","/examination/marks","/examination/results","/exams","/exams/grades","/exams/marks","/exams/results","/expenses","/families","/fees","/fees/challans","/fees/create","/fees/proofs","/fees/reporting","/fees/reports","/fees/settings","/fees/view","/id-cards","/library","/messages","/notifications","/paper-generator","/paper-generator/saved","/paper-generator/unified","/parent-portal","/parents","/question-bank","/settings","/student","/student-portal","/students","/students/admissions","/students/promote","/students/reports","/timetable","/transport"]);
  var paperTabs = new Set(['build','saved','bank','early_years','diary','lesson','word_editor','board_pattern']);
  var nav = null, header = null, observer = null, paintPending = false;
  var memory = {identity:'', entries:[], cursor:-1, resume:null, updated:0};

  function identity() {
    try {
      var user = JSON.parse(localStorage.getItem('al_siddique_user') || 'null');
      if (!user || !user.id || !localStorage.getItem('al_siddique_token')) return '';
      var school = user.school_id == null ? (user.tenant_id == null ? '' : user.tenant_id) : user.school_id;
      return String(user.id) + '|' + String(school) + '|' + String(user.role || '').toLowerCase();
    } catch (_) { return ''; }
  }
  function safeRoute(url) {
    try {
      var target = new URL(url, location.href);
      if (target.origin !== location.origin) return null;
      var path = target.pathname.replace(/\/+$/, '') || '/';
      if (!/^\/[a-zA-Z0-9/_-]*$/.test(path) || path.length > 140) return null;
      if (path === '/' || path === '/login' || path === '/change-password') return null;
      var family = path.split('/')[1];
      if (!EXACT.has(path) || !Object.prototype.hasOwnProperty.call(ROUTES,family)) return null;
      // Never persist free-form searches, student identifiers or auth query strings.
      var qs = '';
      if (family === 'paper-generator' && paperTabs.has(target.searchParams.get('tab'))) {
        qs = '?tab=' + encodeURIComponent(target.searchParams.get('tab'));
      }
      if (family === 'notifications' && ['fee','results','attendance'].includes(target.searchParams.get('tab'))) qs='?tab='+target.searchParams.get('tab');
      return path + qs;
    } catch (_) { return null; }
  }
  function read() {
    try {
      var saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (saved && saved.identity === identity() && Array.isArray(saved.entries) &&
          Date.now() >= Number(saved.updated || 0) &&
          Date.now() - Number(saved.updated || 0) <= TTL) {
        memory = {
          identity:saved.identity,
          entries:saved.entries.filter(function (x) { return x && safeRoute(x.route); }).slice(-MAX),
          cursor:Math.min(Math.max(0,Number(saved.cursor) || 0),Math.max(0,saved.entries.length-1)),
          resume:safeRoute(saved.resume),
          updated:Number(saved.updated)
        };
        if (!memory.entries.length) memory.cursor = -1;
        return;
      }
    } catch (_) {}
    memory = {identity:identity(),entries:[],cursor:-1,resume:null,updated:0};
  }
  function save() {
    try {
      memory.updated = Date.now();
      sessionStorage.setItem(KEY,JSON.stringify(memory));
    } catch (_) {}
  }
  function key() {
    try {
      var state = history.state || {};
      return typeof state.key === 'string' ? state.key : null;
    } catch (_) { return null; }
  }
  function sync(kind) {
    var actor = identity();
    if (!actor) {
      memory = {identity:'',entries:[],cursor:-1,resume:null,updated:0};
      try { sessionStorage.removeItem(KEY); } catch (_) {}
      update();
      return;
    }
    if (actor !== memory.identity) {
      read();
      if (actor !== memory.identity) memory = {identity:actor,entries:[],cursor:-1,resume:null,updated:0};
    }
    var route = safeRoute(location.href);
    if (!route) { update(); return; }
    var entry = {route:route,key:key()};
    var previous = memory.entries[memory.cursor];
    if (kind === 'pop') {
      var match = -1;
      if (entry.key) {
        for (var i=memory.entries.length-1;i>=0;i--) {
          if (memory.entries[i].key === entry.key && memory.entries[i].route === route) {match=i;break;}
        }
      }
      if (match < 0) {
        for (var j=memory.cursor-1;j>=0;j--) if (memory.entries[j].route === route) {match=j;break;}
        if (match < 0) for (var k=memory.cursor+1;k<memory.entries.length;k++) if (memory.entries[k].route === route) {match=k;break;}
      }
      if (match >= 0) memory.cursor = match;
      else if (!previous || previous.route !== route) {
        memory.entries = memory.entries.slice(0,memory.cursor+1).concat([entry]).slice(-MAX);
        memory.cursor = memory.entries.length-1;
      }
    } else if (kind === 'load' && (!previous || previous.route !== route)) {
      var navEntry = null;
      try {navEntry = performance.getEntriesByType('navigation')[0];} catch (_) {}
      var historyLoad = navEntry && navEntry.type === 'back_forward';
      var oldIndex = -1;
      if (entry.key) for (var z=0;z<memory.entries.length;z++) {
        if (memory.entries[z].key === entry.key && memory.entries[z].route === route) {oldIndex=z;break;}
      }
      if (oldIndex < 0 && historyLoad) {
        for (var z1=memory.cursor-1;z1>=0;z1--) if (memory.entries[z1].route === route) {oldIndex=z1;break;}
        if (oldIndex < 0) for (var z2=memory.cursor+1;z2<memory.entries.length;z2++) if (memory.entries[z2].route === route) {oldIndex=z2;break;}
      }
      if (oldIndex >= 0) memory.cursor=oldIndex;
      else {memory.entries = memory.entries.slice(0,memory.cursor+1).concat([entry]).slice(-MAX);memory.cursor=memory.entries.length-1;}
    } else if (kind === 'replace') {
      if (previous) memory.entries[memory.cursor] = entry;
      else {memory.entries=[entry];memory.cursor=0;}
    } else if (!previous || previous.route !== route || (entry.key && previous.key && previous.key !== entry.key)) {
      memory.entries = memory.entries.slice(0,memory.cursor+1).concat([entry]).slice(-MAX);
      memory.cursor = memory.entries.length-1;
    } else if (entry.key && !previous.key) {
      memory.entries[memory.cursor] = entry;
    }
    if (route !== '/dashboard' && route !== '/profile') memory.resume = route;
    save();
    update();
  }
  function label(route) {
    if (!route) return 'Academic Portal';
    var pathname = route.split('?')[0];
    var pieces = pathname.split('/').filter(Boolean);
    var family = pieces[0] || '';
    var subject = ROUTES[family] || 'Academic Portal';
    var tab = '';
    if (family === 'paper-generator') {
      try { tab = new URLSearchParams(route.split('?')[1] || '').get('tab') || ''; } catch (_) {}
    }
    var detail = LABELS[tab] || LABELS[pieces[1]] || (pieces[1] ? pieces[1].replace(/[-_]/g,' ') : '');
    return subject + (detail ? ' / ' + detail : '');
  }
  function button(action, text, tip) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('data-assps-nav-action', action);
    b.setAttribute('aria-label',tip);
    b.title = tip;
    b.className = 'assps-a333-button';
    b.textContent = text;
    b.addEventListener('click',function () {
      if (b.disabled) return;
      if (action === 'back' && memory.cursor > 0) {memory.cursor--;save();history.back();}
      if (action === 'forward' && memory.cursor >= 0 && memory.cursor < memory.entries.length-1) {memory.cursor++;save();history.forward();}
      if (action === 'refresh') location.reload();
      if (action === 'resume' && memory.resume && memory.resume !== safeRoute(location.href)) {
        location.assign(memory.resume);
      }
    });
    return b;
  }
  function injectStyles() {
    if (document.getElementById('assps-a333-nav-style')) return;
    var style = document.createElement('style');
    style.id='assps-a333-nav-style';
    style.textContent =
      '#assps-a333-nav{flex-shrink:0;min-height:37px;padding:5px 18px;display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--apex-bg-secondary,#f6f9fc);color:var(--apex-text,#203653);border-bottom:1px solid rgba(115,134,159,.22);font-family:Inter,Segoe UI,sans-serif;font-size:12px;position:relative;z-index:20;box-sizing:border-box}' +
      '#assps-a333-nav .assps-a333-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;font-weight:650;letter-spacing:.1px;opacity:.83}' +
      '#assps-a333-nav .assps-a333-actions{display:flex;gap:6px;align-items:center;flex-shrink:0}' +
      '#assps-a333-nav .assps-a333-button{cursor:pointer;white-space:nowrap;padding:5px 10px;border-radius:8px;border:1px solid rgba(118,141,166,.28);background:rgba(255,255,255,.58);color:var(--apex-text,#203653);font-size:12px;line-height:18px;font-family:inherit;font-weight:620}' +
      '#assps-a333-nav .assps-a333-button:hover:not(:disabled){border-color:#b68a24;background:rgba(197,156,63,.10)}' +
      '#assps-a333-nav .assps-a333-button:focus-visible{outline:2px solid #b68a24;outline-offset:2px}' +
      '#assps-a333-nav .assps-a333-button:disabled{opacity:.38;cursor:default}' +
      '@media(max-width:650px){#assps-a333-nav{padding:5px 8px;gap:4px;font-size:10px}#assps-a333-nav .assps-a333-button{padding:5px 6px;font-size:11px}#assps-a333-nav .assps-a333-title{max-width:110px}}' +
      '@media print{#assps-a333-nav{display:none!important}}';
    document.head.appendChild(style);
  }
  function mount() {
    if (!identity()) { if (nav && nav.parentNode) nav.remove(); return; }
    var host = document.querySelector('.app-topbar-slot');
    if (!host || !host.parentNode) return;
    if (nav && nav.parentNode === host.parentNode && nav.previousElementSibling === host) return;
    if (!nav) {
      injectStyles();
      nav = document.createElement('nav');
      nav.id='assps-a333-nav';
      nav.setAttribute('aria-label','Academic portal page navigation');
      var title = document.createElement('span');
      title.className='assps-a333-title';
      title.setAttribute('data-assps-current-page','');
      nav.appendChild(title);
      var actions=document.createElement('div');
      actions.className='assps-a333-actions';
      actions.appendChild(button('back','‹ Back','Go to previous portal page'));
      actions.appendChild(button('forward','Forward ›','Go to next portal page'));
      actions.appendChild(button('refresh','↻ Reload','Reload current page'));
      actions.appendChild(button('resume','Resume','Return to last working page'));
      nav.appendChild(actions);
    }
    host.insertAdjacentElement('afterend',nav);
    update();
  }
  function update() {
    var actor = identity();
    if (!actor) { if (nav && nav.parentNode) nav.remove(); return; }
    if (!nav || !nav.isConnected) { scheduleMount(); return; }
    var current = safeRoute(location.href);
    var title = nav.querySelector('[data-assps-current-page]');
    if (title) title.textContent=label(current);
    var back=nav.querySelector('[data-assps-nav-action=back]');
    var forward=nav.querySelector('[data-assps-nav-action=forward]');
    var resume=nav.querySelector('[data-assps-nav-action=resume]');
    if (back) back.disabled = !(memory.cursor>0);
    if (forward) forward.disabled = !(memory.cursor>=0 && memory.cursor<memory.entries.length-1);
    if (resume) {
      resume.disabled = !memory.resume || memory.resume===current;
      resume.title=memory.resume ? ('Resume: '+label(memory.resume)) : 'No previous working page';
    }
  }
  function scheduleMount() {
    if (paintPending) return;
    paintPending=true;
    requestAnimationFrame(function () {paintPending=false;mount();});
  }
  read();
  sync('load');
  ['pushState','replaceState'].forEach(function (name) {
    var original=history[name];
    history[name]=function () {
      var result=original.apply(this,arguments);
      sync(name==='pushState'?'push':'replace');
      return result;
    };
  });
  addEventListener('popstate',function () {sync('pop');});
  addEventListener('pageshow',function () {sync('load');scheduleMount();});
  addEventListener('storage',function (e) {
    if (e.key==='al_siddique_user' || e.key==='al_siddique_token' || e.key===null) {
      sync('load');scheduleMount();
    }
  });
  document.addEventListener('DOMContentLoaded',function () {
    scheduleMount();
    observer=new MutationObserver(function () { if (!nav || !nav.isConnected) scheduleMount(); });
    if (document.body) observer.observe(document.body,{childList:true,subtree:true});
  },{once:true});
})();
