const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

function scriptsFromHTML(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map(([, attributes, source]) => ({
    attributes, source, isBank: /\bid\s*=\s*["']question-bank["']/.test(attributes),
    external: /\bsrc\s*=/.test(attributes)
  }));
}

function loadApp({ storage = new Map(), beforeApp = '', storageErrors = {}, html = readFileSync(join(__dirname, 'eiken-town.html'), 'utf8') } = {}) {
  const timers = new Map();
  const spoken = [];
  let timerId = 0;
  let context;
  const run = source => vm.runInContext(source, context);
  class Element {
    constructor(tagName = 'div') {
      this.tagName = tagName.toLowerCase();
      this.children = [];
      this.parentElement = null;
      this.attributes = {};
      this.dataset = {};
      this.style = {};
      this.className = '';
      this.value = '';
      this.disabled = false;
      this.checked = false;
      this.listeners = {};
      this.classList = {
        contains: name => this.className.split(/\s+/).includes(name),
        add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(' '); },
        remove: (...names) => { this.className = this.className.split(/\s+/).filter(name => !names.includes(name)).join(' '); },
        toggle: (name, force) => {
          const enabled = force === undefined ? !this.classList.contains(name) : force;
          this.classList[enabled ? 'add' : 'remove'](name);
          return enabled;
        }
      };
    }
    setAttribute(name, value) {
      value = String(value);
      this.attributes[name] = value;
      if (name === 'class') this.className = value;
      if (name === 'id' || name === 'value') this[name] = value;
      if (name === 'disabled' || name === 'checked') this[name] = true;
      if (name.startsWith('data-')) this.dataset[name.slice(5)] = value;
    }
    getAttribute(name) { return this.attributes[name] ?? null; }
    set innerHTML(value) {
      for (const child of this.children) child.parentElement = null;
      this.children = [];
      this.text = '';
      this.markup = String(value);
      parse(this.markup, this);
    }
    get innerHTML() { return this.markup || ''; }
    set textContent(value) { this.innerHTML = ''; this.text = String(value); }
    get textContent() { return (this.text || '') + this.children.map(child => child.textContent).join(''); }
    appendChild(child) { child.parentElement = this; this.children.push(child); return child; }
    remove() {
      if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this);
      this.parentElement = null;
    }
    insertAdjacentHTML(position, value) {
      assert.equal(position, 'beforeend');
      this.markup = (this.markup || '') + value;
      parse(value, this);
    }
    matches(selector) {
      const not = selector.match(/:not\(([^)]+)\)/);
      if (not && this.matches(not[1])) return false;
      selector = selector.replace(/:not\([^)]+\)/g, '');
      if (selector.includes(':disabled') && !this.disabled) return false;
      if (selector.includes(':checked') && !this.checked) return false;
      selector = selector.replace(/:(disabled|checked)/g, '');
      const tag = selector.match(/^[a-z][\w-]*/i);
      if (tag && tag[0] !== this.tagName) return false;
      for (const [, name] of selector.matchAll(/#([\w-]+)/g)) if (this.id !== name) return false;
      for (const [, name] of selector.matchAll(/\.([\w-]+)/g)) if (!this.classList.contains(name)) return false;
      for (const [, name, value] of selector.matchAll(/\[([\w-]+)(?:=["']?([^\]"']+)["']?)?\]/g)) {
        if (!(name in this.attributes) || (value !== undefined && this.attributes[name] !== value)) return false;
      }
      return true;
    }
    querySelectorAll(selector) {
      const selectors = selector.split(',').map(part => part.trim().split(/\s+/));
      const matches = element => selectors.some(parts => {
        if (!element.matches(parts.at(-1))) return false;
        let parent = element.parentElement;
        for (let i = parts.length - 2; i >= 0; i--) {
          while (parent && !parent.matches(parts[i])) parent = parent.parentElement;
          if (!parent) return false;
          parent = parent.parentElement;
        }
        return true;
      });
      const result = [];
      const visit = element => {
        for (const child of element.children) {
          if (matches(child)) result.push(child);
          visit(child);
        }
      };
      visit(this);
      return result;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) {
      let element = this;
      while (element && !element.matches(selector)) element = element.parentElement;
      return element;
    }
    addEventListener(name, callback) { (this.listeners[name] ||= []).push(callback); }
    dispatchEvent(event) {
      event.target ||= this;
      this['on' + event.type]?.(event);
      for (const listener of this.listeners[event.type] || []) listener(event);
    }
    click() {
      if (this.disabled) return;
      this.dispatchEvent({ type: 'click', stopPropagation() {}, preventDefault() {} });
      if (!this.onclick && this.attributes.onclick) run(this.attributes.onclick);
    }
    focus() { document.activeElement = this; }
  }
  function parse(markup, root) {
    const stack = [root];
    for (const token of markup.matchAll(/<!--[\s\S]*?-->|<\/?([a-z][\w-]*)\b([^>]*)>|([^<]+)/gi)) {
      if (token[3]) {
        const text = new Element('#text');
        text.text = token[3];
        stack.at(-1).appendChild(text);
        continue;
      }
      if (!token[1]) continue;
      const tag = token[1].toLowerCase();
      if (token[0].startsWith('</')) {
        const index = stack.findLastIndex(element => element.tagName === tag);
        if (index > 0) stack.length = index;
        continue;
      }
      const element = new Element(tag);
      for (const [, name, double, single, bare] of token[2].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
        element.setAttribute(name, double ?? single ?? bare ?? '');
      }
      stack.at(-1).appendChild(element);
      if (!['input', 'br', 'hr', 'img', 'meta', 'link'].includes(tag)) stack.push(element);
    }
  }
  const document = new Element('document');
  document.createElement = tag => new Element(tag);
  parse(html.match(/<body>([\s\S]*?)<script/)[1], document);
  document.body = document;
  const sandbox = {
    document, console,
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => { if (storageErrors.write) throw new Error('Storage unavailable'); return storage.set(key, String(value)); },
      removeItem: key => storage.delete(key)
    },
    setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => timers.delete(id),
    requestAnimationFrame() {},
    scrollTo() {},
    addEventListener() {},
    speechSynthesis: {
      getVoices: () => [],
      cancel() { sandbox.cancelCount++; },
      speak(utterance) { spoken.push(utterance.text); utterance.onend?.(); }
    },
    SpeechSynthesisUtterance: function(text) { this.text = text; },
    cancelCount: 0
  };
    sandbox.window = sandbox;
    context = vm.createContext(sandbox);
    const readErrors = { current: !!storageErrors.read };
    sandbox.localStorage.getItem = key => { if (readErrors.current) throw new Error('Storage read failure'); return storage.get(key) ?? null; };
  const scripts = scriptsFromHTML(html);
  for (const script of scripts.filter(script => script.isBank && !script.external)) {
    vm.runInContext(script.source, context, { filename: 'eiken-town.html#question-bank' });
  }
  run(beforeApp);
  for (const script of scripts.filter(script => !script.isBank && !script.external)) {
    vm.runInContext(script.source, context, { filename: 'eiken-town.html' });
  }
  return {
    context, run, document, storage, timers, spoken, readErrors,
    get: selector => document.querySelector(selector),
    json: source => JSON.parse(run(`JSON.stringify(${source})`)),
    flushTimers(delay) {
      for (const [id, timer] of [...timers]) {
        if (delay === undefined || timer.delay === delay) {
          timers.delete(id);
          timer.callback();
        }
      }
    }
  };
}

function assertGradeCards(app, scope, selected) {
  const group = app.get(scope);
  assert.equal(group.tagName, 'fieldset');
  assert.match(group.querySelector('legend').textContent, /練習する級/);
  assert.equal(group.querySelectorAll('select').length, 0);
  const cards = group.querySelectorAll('.grade-card');
  assert.deepEqual(cards.map(card => card.dataset.grade), ['5', '4', '3', 'pre2', '2', 'pre1']);
  for (const card of cards) {
    const grade = card.dataset.grade;
    const display = grade === 'pre2' ? '英検準2級' : grade === 'pre1' ? '英検準1級' : `英検${grade}級`;
    assert.equal(card.tagName, 'button');
    assert.equal(card.getAttribute('type'), 'button');
    assert.equal(card.getAttribute('aria-label'), display);
    assert.equal(card.querySelector('.grade-name').textContent, display);
    assert.equal(card.getAttribute('aria-pressed'), String(grade === selected));
    assert.equal(card.querySelector('.grade-status').textContent, grade === selected ? '選択中' : '選ぶ');
    const description = app.get('#' + card.getAttribute('aria-describedby'));
    assert.equal(description, card.querySelector('.grade-description'));
    assert.match(description.textContent, grade === '5' ? /はじめて.*きほん/ : /次のステップ/);
    assert.equal(card.disabled, false);
    assert.equal(card.getAttribute('tabindex'), null);
    assert.equal(typeof card.onclick, 'function');
  }
  assert.equal(group.querySelectorAll('[aria-pressed="true"]').length, 1);
}

module.exports = { loadApp };

if (require.main === module) {
  test('HTML embeds the question bank without an external question script', () => {
    const html = readFileSync(join(__dirname, 'eiken-town.html'), 'utf8');
    const scripts = scriptsFromHTML(html);
    const banks = scripts.filter(script => script.isBank);
    assert.equal(banks.length, 1);
    assert.equal(banks[0].external, false);
    assert.doesNotMatch(html, /questions\.js/i);
    assert.equal(scripts.filter(script => script.external && (script.isBank || /questions\.js/i.test(script.attributes))).length, 0);
    assert.equal(scripts.filter(script => !script.external && !script.isBank).length, 1);
    assert.ok(scripts.indexOf(banks[0]) < scripts.findIndex(script => !script.external && !script.isBank));
    const app = loadApp({ html });
    assert.deepEqual(app.json('Object.keys(QUESTION_BANKS)'), ['2', '3', '4', '5', 'pre2', 'pre1']);
    for (const grade of ['4', '5', '3', 'pre2', '2', 'pre1']) {
      const expectedCats = (grade === '4' || grade === '5') ? ['library', 'school', 'cafe', 'station', 'park', 'flower'] : grade === '3' ? ['library', 'school', 'cafe', 'station', 'park', 'flower', 'essay'] : grade === 'pre1' ? ['library', 'school', 'cafe', 'flower', 'station', 'park', 'essay', 'summary'] : ['library', 'school', 'cafe', 'station', 'park', 'flower', 'essay', 'summary'];
      assert.deepEqual(app.json(`Object.keys(QUESTION_BANKS['${grade}'])`), expectedCats);
    }
  });

  test('all inline HTML scripts including the embedded question bank have valid syntax', () => {
    const html = readFileSync(join(__dirname, 'eiken-town.html'), 'utf8');
    for (const script of scriptsFromHTML(html).filter(script => !script.external)) {
      assert.doesNotThrow(() => new vm.Script(script.source));
    }
  });

  for (const grade of ['4', '5', '3', 'pre2', '2', 'pre1']) {
    for (const cat of ((grade === '4' || grade === '5') ? ['library', 'school', 'cafe', 'station', 'park', 'flower'] : grade === '3' ? ['library', 'school', 'cafe', 'station', 'park', 'flower', 'essay'] : grade === 'pre1' ? ['library', 'school', 'cafe', 'flower', 'station', 'park', 'essay', 'summary'] : ['library', 'school', 'cafe', 'station', 'park', 'flower', 'essay', 'summary'])) {
      for (const level of [1, 2, 3]) {
        test(`grade ${grade} ${cat} level ${level} tile opens menu and start button renders quiz`, () => {
          const { run, get, json } = loadApp();
          run(`activeGrade='${grade}'; state=freshState(activeGrade); state.coins=2000; BUILDINGS.forEach((b,i)=>confirmBuild(i,b.cat)); state.placed['${cat}'].level=${level}; goHome()`);
          const before = json('state');
          const tile = get(`#fb-grid .lot[data-cat="${cat}"]`);
          assert.ok(tile);
          assert.equal(get('#scene-fallback').classList.contains('hidden'), false);
          assert.doesNotThrow(() => tile.click());
          assert.equal(get('#modal-root').classList.contains('open'), true);
          assert.match(get('#modal').innerHTML, new RegExp(`Lv\\.${level}`));
          const start = get('#bm-start');
          assert.ok(start);
          assert.equal(start.disabled, false);
          assert.doesNotThrow(() => start.click());
          assert.equal(get('#modal-root').classList.contains('open'), false);
          assert.equal(get('#scr-town').classList.contains('active'), false);
          assert.equal(get('#scr-quiz').classList.contains('active'), true);
          assert.equal(run('session.grade'), grade);
          assert.equal(run('session.cat'), cat);
          const length = (cat === 'essay' || cat === 'summary') ? 1 : cat === 'flower' ? (grade === '5' ? 2 : [2, 3, 5][level - 1]) : 5;
          assert.equal(run('session.qs.length'), length);
          assert.equal(run('new Set(session.qs.map(item=>item.id)).size'), length);
          assert.equal(run(`session.qs.every(item=>item.cat==='${cat}'&&item.id.startsWith('g${grade}-${cat}-')&&item.q===questionById(item.id,'${grade}').q)`), true);
          assert.equal(get('#q-dots').querySelectorAll('.dot').length, length);
          assert.ok(get('#q-card').innerHTML.length > 0);
          assert.ok(get('#q-answer-zone').innerHTML.length > 0);
          if ((cat === 'flower' && grade === '5') || cat === 'essay' || cat === 'summary') assert.ok(get('#wr-box'));
          else assert.equal(get('#q-answer-zone').querySelectorAll('.choice').length, run('session.qs[0].q.c?.length||session.qs[0].q.pairs.length'));
          if (cat === 'station' && run('questionKind(session.qs[0].q)') === 'order-pair') assert.ok(get('.order-units'));
          if (cat === 'station' && run('questionKind(session.qs[0].q)') === 'reading') assert.equal(get('.reading-passage').textContent, run('session.qs[0].q.passage'));
          if (cat === 'flower' && grade !== '5') assert.equal(get('.reading-passage').textContent, run('session.qs[0].q.passage'));
          if (cat === 'park') assert.ok(get('#speak-btn'));
          assert.deepEqual(json('state'), before);
        });
      }
    }

    for (const [name, replacement, beforeApp] of [
      ['missing script', '', ''],
      ['missing declaration', '<script id="question-bank"></script>', ''],
      ['undefined bank', '<script id="question-bank">const QUESTION_BANKS=undefined;</script>', ''],
      ['null bank', '<script id="question-bank">const QUESTION_BANKS=null;</script>', ''],
      ['missing grade', null, `delete QUESTION_BANKS['${grade}']`],
      ['missing category', null, `delete QUESTION_BANKS['${grade}'].library`],
      ['empty category', null, `QUESTION_BANKS['${grade}'].library=[]`],
      ['invalid category', null, `QUESTION_BANKS['${grade}'].library={}`]
    ]) {
      test(`grade ${grade} ${name} keeps menu, session and state intact while removal works`, () => {
        let html = readFileSync(join(__dirname, 'eiken-town.html'), 'utf8');
        if (replacement !== null) html = html.replace(/<script id="question-bank">[\s\S]*?<\/script>/, replacement);
        const { run, get, json, storage } = loadApp({ html, beforeApp });
        run(`activeGrade='${grade}'; state=freshState(activeGrade); confirmBuild(0,'library'); goHome(); state.review=['g${grade}-library-${(grade === '5' || grade === '4') ? '001' : 101}']; save()`);
        assert.equal(run(`validReview('g${grade}-library-${(grade === '5' || grade === '4') ? '001' : 101}')`), replacement === null);
        get('#fb-grid .lot[data-cat="library"]').click();
        const menu = get('#modal').innerHTML;
        const before = json('state');
        const bytes = storage.get('eikenTownSave_v1');
        for (const previous of ['null', `({grade:'${grade}',finished:true,qs:[],results:[]})`]) {
          run(`session=${previous}`);
          const session = run('session');
          assert.doesNotThrow(() => get('#bm-start').click());
          assert.equal(run('session'), session);
          assert.deepEqual(json('state'), before);
          assert.equal(storage.get('eikenTownSave_v1'), bytes);
          assert.equal(get('#modal-root').classList.contains('open'), true);
          assert.equal(get('#modal').innerHTML, menu);
          assert.equal(get('#scr-town').classList.contains('active'), true);
          assert.equal(get('#scr-quiz').classList.contains('active'), false);
          assert.match(get('#toast-root').children.at(-1).textContent, /問題データを読み込めません/);
        }
        assert.doesNotThrow(() => get('#bm-remove').click());
        assert.doesNotThrow(() => get('#yn-yes').click());
        assert.equal(run('state.placed.library'), undefined);
        const removed = { ...before, placed: {} };
        assert.deepEqual(json('state'), removed);
        assert.equal(get('#modal-root').classList.contains('open'), false);
      });
    }
  }

  test('missing embedded bank tolerates saved and legacy review lookup during startup', () => {
    const html = readFileSync(join(__dirname, 'eiken-town.html'), 'utf8').replace(/<script id="question-bank">[\s\S]*?<\/script>/, '');
    for (const saved of [
      { v: 4, g: 7, coins: 88, placed: { library: { tile: 0, level: 2 } }, review: ['library:0', 'g4-library-001'] },
      { v: 5, activeGrade: '5', towns: { '5': { v: 5, g: 7, coins: 88, placed: { library: { tile: 0, level: 2 } }, review: ['g5-library-001'] } } }
    ]) {
      const bytes = JSON.stringify(saved);
      const storage = new Map([['eikenTownSave_v1', bytes]]);
      let app;
      assert.doesNotThrow(() => { app = loadApp({ html, storage }); });
      assert.equal(app.run('loadBlocked'), false);
      assert.equal(app.run('state.coins'), 88);
      assert.equal(app.run('state.placed.library.level'), 2);
      assert.equal(storage.get('eikenTownSave_v1'), bytes);
    }
  });

  test('init, build, upgrade, cancel removal, remove, reload and rebuild preserve learning and unlocks', () => {
    const app = loadApp();
    const { run, get, json } = app;
    assert.equal(run('state.v'), 5);
    assert.deepEqual(json('state.unlocked'), ['library', 'review']);
    run("state.coins=500; confirmBuild(0,'library'); confirmBuild(1,'school'); state.progress.school=16; state.totalCorrect=16; state.totalAnswered=18; state.review=['g4-school-001']; openBuildingMenu('school')");
    get('#bm-up').click();
    assert.equal(run('state.placed.school.level'), 2);
    const retained = json('({coins:state.coins,progress:state.progress,review:state.review,totalCorrect:state.totalCorrect,totalAnswered:state.totalAnswered,unlocked:state.unlocked})');
    run("openBuildingMenu('school')");
    get('#bm-remove').click();
    assert.match(get('#modal').innerHTML, /コイン.*戻|返/);
    get('#yn-no').click();
    assert.equal(run('state.placed.school.level'), 2);
    run("openBuildingMenu('school')");
    get('#bm-remove').click();
    const confirm = get('#yn-yes').onclick;
    get('#yn-yes').click();
    confirm();
    assert.equal(run('state.placed.school'), undefined);
    assert.deepEqual(json('({coins:state.coins,progress:state.progress,review:state.review,totalCorrect:state.totalCorrect,totalAnswered:state.totalAnswered,unlocked:state.unlocked})'), retained);
    run('openPalette()');
    assert.equal(get('[data-cat="cafe"]').disabled, false);
    assert.equal(get('[data-cat="school"]').disabled, false);
    const reloaded = loadApp({ storage: app.storage });
    assert.deepEqual(reloaded.json('state'), json('state'));
    reloaded.run("confirmBuild(2,'school')");
    assert.deepEqual(reloaded.json('state.placed.school'), { tile: 2, level: 1 });
    assert.equal(reloaded.run('state.progress.school'), 16);
    assert.equal(reloaded.run('state.coins'), retained.coins - 30);
    assert.deepEqual(reloaded.json('state.review'), retained.review);
    assert.deepEqual(reloaded.json('state.unlocked'), retained.unlocked);
    confirm();
    assert.equal(run('state.placed.school'), undefined);
  });

  test('roads require valid unoccupied tiles; removal confirms without refund', () => {
    const { run, get, json } = loadApp();
    run("confirmBuild(0,'library'); tryRoad(1)");
    const before = json('state');
    run("for(const t of [null,undefined,-1,121,1.5,NaN,Infinity,'2',{},0,1])tryRoad(t)");
    assert.deepEqual(json('state'), before);
    run("enterPlace('school'); onTileTap(1)");
    assert.equal(get('#yn-yes'), null);
    run("confirmBuild(1,'school')");
    assert.deepEqual(json('state'), before);
    run('onTileTap(1)');
    get('#yn-no').click();
    assert.deepEqual(json('state'), before);
    run('onTileTap(1)');
    get('#yn-yes').click();
    assert.deepEqual(json('state.roads'), []);
    assert.equal(run('state.coins'), before.coins);
    run("confirmBuild(1,'school')");
    assert.equal(run('state.placed.school.level'), 1);
  });

  test('decorations place on free tiles for coins, reject invalid spots, and remove without refund', () => {
    const { run, get, json } = loadApp();
    run("confirmBuild(0,'library'); tryRoad(1)");
    const before = json('state');
    run("for(const id of [null,undefined,'missing','__proto__','library','',0])confirmDeco(5,id)");
    run("for(const t of [null,undefined,-1,121,1.5,NaN,Infinity,'2',{},0,1])confirmDeco(t,'bench')");
    assert.deepEqual(json('state'), before);
    run("confirmDeco(0,'bench'); confirmDeco(1,'bench')");
    assert.deepEqual(json('state'), before);
    run("confirmDeco(5,'flowerbed')");
    assert.deepEqual(json('state.decorations'), [{ tile: 5, kind: 'flowerbed' }]);
    assert.equal(run('state.coins'), before.coins - 5);
    run("tryRoad(5); confirmBuild(5,'school')");
    assert.deepEqual(json('state.roads'), [1]);
    assert.equal(run('state.placed.school'), undefined);
    assert.equal(run('state.coins'), before.coins - 5);
    run("confirmDeco(5,'lamp')");
    assert.deepEqual(json('state.decorations'), [{ tile: 5, kind: 'flowerbed' }]);
    run("state.coins=0; confirmDeco(6,'lamp')");
    assert.deepEqual(json('state.decorations'), [{ tile: 5, kind: 'flowerbed' }]);
    run("state.coins=50; enterPlace('deco:lamp'); onTileTap(6)");
    get('#yn-yes').click();
    assert.deepEqual(json('state.decorations'), [{ tile: 5, kind: 'flowerbed' }, { tile: 6, kind: 'lamp' }]);
    assert.equal(run('state.coins'), 50 - 10);
    run("exitPlace(); enterPlace('deco:missing'); enterPlace('deco:'); enterPlace('library')");
    assert.equal(run('pendingPlace'), null);
    run('openPalette()');
    assert.equal(get('[data-cat="deco:fountain"]').disabled, false);
    get('[data-cat="deco:fountain"]').click();
    assert.equal(run('pendingPlace'), 'deco:fountain');
    run('exitPlace()');
    const coinsBefore = json('state').coins;
    run('onTileTap(5)');
    get('#yn-no').click();
    assert.deepEqual(json('state.decorations'), [{ tile: 5, kind: 'flowerbed' }, { tile: 6, kind: 'lamp' }]);
    run('onTileTap(5)');
    get('#yn-yes').click();
    assert.deepEqual(json('state.decorations'), [{ tile: 6, kind: 'lamp' }]);
    assert.equal(run('state.coins'), coinsBefore);
    assert.equal(run('DECOS.length'), 9);
    run("state.coins=100; confirmDeco(7,'swing'); confirmDeco(8,'mailbox'); confirmDeco(9,'clocktower'); confirmDeco(10,'busstop')");
    assert.deepEqual(json('state.decorations'), [{ tile: 6, kind: 'lamp' }, { tile: 7, kind: 'swing' }, { tile: 8, kind: 'mailbox' }, { tile: 9, kind: 'clocktower' }, { tile: 10, kind: 'busstop' }]);
    assert.equal(run('state.coins'), 100 - 15 - 5 - 20 - 10);
  });

  test('core build and category actions validate input, unlocks, funds and stale selection', () => {
    const { run, get, json } = loadApp();
    const before = json('state');
    run("for(const cat of [null,undefined,'missing','__proto__','constructor','__road','school']){confirmBuild(0,cat);enterPlace(cat);openBuildingMenu(cat);canUpgrade(cat)}");
    run("exitPlace(); for(const t of [null,undefined,-1,121,0.1,NaN,Infinity,'0',{}]){confirmBuild(t,'library');onTileTap(t)}");
    assert.deepEqual(json('state'), before);
    run("enterPlace('library'); onTileTap(0); exitPlace()");
    get('#yn-yes').click();
    assert.equal(run('state.placed.library'), undefined);
    run("enterPlace('library'); onTileTap(0)");
    get('#yn-yes').click();
    assert.equal(run('state.placed.library.tile'), 0);
    run("state.coins=0; confirmBuild(2,'school'); confirmBuild(3,'library')");
    assert.deepEqual(json('state.placed'), { library: { tile: 0, level: 1 } });
  });

  test('active sessions guard removal including already opened confirmations and stale upgrades', () => {
    const { run, get, json } = loadApp();
    run("confirmBuild(0,'library'); tryRoad(1); state.progress.library=16; openBuildingMenu('library')");
    const upgrade = get('#bm-up').onclick;
    get('#bm-remove').click();
    const removeBuilding = get('#yn-yes').onclick;
    run('onTileTap(1)');
    const removeRoad = get('#yn-yes').onclick;
    run("startSession('library',false)");
    const before = json('state');
    removeBuilding();
    removeRoad();
    upgrade();
    run("onTileTap(1); confirmBuild(2,'school'); tryRoad(3); openBuildingMenu('library')");
    assert.deepEqual(json('state'), before);
    run('goHome()');
    get('#yn-no').click();
    assert.notEqual(run('session'), null);
    run('goHome()');
    get('#yn-yes').click();
    assert.equal(run('session'), null);
    run('onTileTap(1)');
    get('#yn-yes').click();
    assert.deepEqual(json('state.roads'), []);
  });

  test('review questions remain valid after removing their building', () => {
    const { run, get, json } = loadApp();
    run("confirmBuild(0,'library'); startSession('library',false); recordResult(false,5,'wrong'); goHome()");
    get('#yn-yes').click();
    run("openBuildingMenu('library')");
    get('#bm-remove').click();
    get('#yn-yes').click();
    run('startReview()');
    assert.equal(run('session.qs[0].q===questionById(session.qs[0].id,session.grade).q'), true);
    assert.equal(run('session.isReview'), true);
    run("recordResult(true,100,'review'); recordResult(true,100,'duplicate'); session.i++; finishSession(); finishSession()");
    assert.equal(run('session.coinsEarned'), 4);
    assert.deepEqual(json('state.review'), []);
    assert.equal(run('state.placed.library'), undefined);
  });

  for (const [name, ok, base] of [['correct', true, 5], ['incorrect', false, 5], ['writing-like', true, 20]]) {
    test(`duplicate ${name} results and finish rewards are idempotent`, () => {
      const { run, json } = loadApp();
      run("confirmBuild(0,'library'); tryRoad(1); startSession('library',false)");
      const initial = json('state');
      run('finishSession()');
      assert.deepEqual(json('state'), initial);
      for (let i = 0; i < 5; i++) {
        run(`recordResult(${ok},${base},'first')`);
        const snapshot = json('({state,session})');
        run(`recordResult(${ok},${base},'duplicate'); recordResult(${!ok},999,'opposite')`);
        assert.deepEqual(json('({state,session})'), snapshot);
        run('session.i++');
      }
      run('finishSession()');
      assert.equal(run('state.totalAnswered'), 5);
      assert.equal(run('state.totalCorrect'), ok ? 5 : 0);
      assert.equal(run('session.coinsEarned'), ok ? 5 * base + 20 + 10 + 2 : 2);
      const finished = json('({state,session})');
      run("finishSession(); recordResult(true,999,'after finish')");
      assert.deepEqual(json('({state,session})'), finished);
    });
  }

  test('feedback callback is bound to its session and question index', () => {
    const { run, get } = loadApp();
    run("confirmBuild(0,'library'); startSession('library',false)");
    get('.choice[data-ok="true"]').click();
    const answer = get('.choice[data-ok="true"]').onclick;
    const next = get('#fb-next').onclick;
    next();
    next();
    answer();
    assert.equal(run('session.i'), 1);
    assert.equal(run('state.totalAnswered'), 1);
    run("startSession('library',false)");
    next();
    answer();
    assert.equal(run('session.i'), 0);
    assert.equal(run('state.totalAnswered'), 1);
  });

  test('order bank refreshes in both directions and submitted slots cannot change or resubmit', () => {
    const { run, get, json } = loadApp();
    run("state.review=['g4-station-001']; startReview()");
    get('#or-bank .chip').click();
    assert.equal(get('#or-bank .chip').classList.contains('hidden'), true);
    get('#or-slots .chip').click();
    assert.equal(get('#or-bank .chip').classList.contains('hidden'), false);
    const count = run('session.qs[0].q.words.length');
    for (let i = 0; i < count; i++) get(`#or-bank [data-id="${i}"]`).click();
    assert.equal(get('#or-check').disabled, false);
    const slot = get('#or-slots .chip');
    const staleSlot = slot.onclick;
    const submit = get('#or-check').onclick;
    get('#or-check').click();
    assert.equal(run('session.results[0]'), true);
    const snapshot = json('({state,session})');
    assert.equal(slot.disabled, true);
    assert.equal(get('#or-clear').disabled, true);
    assert.equal(get('#or-check').disabled, true);
    slot.click();
    staleSlot();
    submit();
    assert.deepEqual(json('({state,session})'), snapshot);
    assert.equal(get('#or-slots').querySelectorAll('.chip').length, count);
    assert.equal(get('#or-check').disabled, true);
    assert.equal(get('#q-answer-zone').querySelectorAll('#fb-next').length, 1);
  });

  test('writing finalization disables rewards button and checks and cannot resubmit', () => {
    const { run, get, json } = loadApp();
    run("state.review=['g4-flower-001']; startReview()");
    const box = get('#wr-box');
    box.value = 'I like reading books at home because they are interesting and I learn many things.';
    box.dispatchEvent({ type: 'input' });
    const submit = get('#wr-submit').onclick;
    get('#wr-submit').click();
    for (const input of get('#wr-checks').querySelectorAll('input')) {
      input.checked = true;
      input.dispatchEvent({ type: 'change' });
    }
    const done = get('#wr-done').onclick;
    get('#wr-done').click();
    assert.equal(get('#wr-done').disabled, true);
    assert.equal(get('#wr-checks').querySelectorAll('input:disabled').length, 3);
    assert.equal(run('session.coinsEarned'), 4);
    const snapshot = json('({state,session})');
    done();
    submit();
    box.dispatchEvent({ type: 'input' });
    assert.deepEqual(json('({state,session})'), snapshot);
    assert.equal(get('#wr-submit').disabled, true);
    assert.equal(get('#q-answer-zone').querySelectorAll('#fb-next').length, 1);
  });

  test('listening timers and stale controls cannot speak after leaving or replacing a question', () => {
    const app = loadApp();
    const { run, get, spoken } = app;
    run("state.review=['g4-park-001','g4-park-012']; startReview()");
    const play = get('#speak-btn').onclick;
    const timer = [...app.timers.values()].find(timer => timer.delay === 350).callback;
    run('goHome()');
    get('#yn-yes').click();
    app.flushTimers(350);
    timer();
    play();
    assert.deepEqual(spoken, []);
    run("state.coins=1000; for(const [i,b] of BUILDINGS.entries()){confirmBuild(i,b.cat);if(b.cat==='park')break} startSession('park',false)");
    app.flushTimers(350);
    assert.equal(spoken.length, 1);
    const oldPlay = get('#speak-btn').onclick;
    get('[data-ok="true"]').click();
    get('#fb-next').click();
    const count = spoken.length;
    oldPlay();
    assert.equal(spoken.length, count);
    run('wipeAndRestart()');
    app.flushTimers(350);
    assert.equal(spoken.length, count);
  });

  test('naming assigns user text through the input value property', () => {
    const { run, get } = loadApp();
    const name = '"<b>town</b>';
    run(`state.townName=${JSON.stringify(name)}; openNaming(false)`);
    assert.equal(get('#nm-input').value, name);
    assert.equal(get('#modal').innerHTML.includes(name), false);
    get('#nm-ok').click();
    assert.equal(run('state.townName'), name);
  });

  test('migration validates data and preserves legacy remapping and removed-category progress', () => {
    const { run, json } = loadApp();
    run("state=migrate({g:5,coins:Infinity,totalCorrect:-3,totalAnswered:NaN,placed:{library:{lot:5,level:2},school:{tile:1,level:1},cafe:{tile:1,level:2},station:{tile:-1,level:1},park:{tile:NaN,level:1},flower:{tile:4,level:Infinity},bad:{tile:3,level:1}},roads:[0,0,1,5,-1,2.5,null],progress:{library:6,school:-1,cafe:Infinity,park:16,bad:3},unlocked:['bad','park'],review:['library:0','library:0','bad:0','library:999','constructor:0',null]})");
    assert.deepEqual(json('state.placed'), { library: { tile: 6, level: 2 }, school: { tile: 1, level: 1 } });
    assert.deepEqual(json('state.roads'), [0, 11]);
    assert.equal(run('state.coins'), 50);
    assert.equal(run('state.totalCorrect'), 0);
    assert.equal(run('state.totalAnswered'), 0);
    assert.deepEqual(json('state.progress'), { library: 6, park: 16 });
    assert.deepEqual(json('state.review'), ['g4-library-001']);
    assert.equal(run("state.unlocked.includes('cafe')&&state.unlocked.includes('park')&&!state.unlocked.includes('bad')"), true);
    assert.deepEqual(json('migrate({progress:null}).progress'), {});
    assert.deepEqual(json('migrate({progress:[]}).progress'), {});
    assert.equal(run('migrate([])'), null);
    run('save(); state=loadState()');
    assert.deepEqual(json('state.placed'), { library: { tile: 6, level: 2 }, school: { tile: 1, level: 1 } });
  });

  test('migration remaps legacy summary ids and drops off-grade buildings', () => {
    const { run, json } = loadApp();
    run("state=migrate({v:5,grade:'pre2',g:9,coins:50,placed:{library:{tile:0,level:1}},roads:[],decorations:[],progress:{},review:['gpre2-essay-107','gpre2-essay-112','gpre2-summary-101','g2-essay-101'],unlocked:['library']},'pre2')");
    assert.deepEqual(json('state.review'), ['gpre2-summary-101', 'gpre2-summary-106']);
    run("state=migrate({v:5,grade:'3',g:9,coins:50,placed:{library:{tile:0,level:1},summary:{tile:1,level:1},essay:{tile:2,level:1}},roads:[],decorations:[],progress:{},review:[],unlocked:['library']},'3')");
    assert.deepEqual(json('state.placed'), { library: { tile: 0, level: 1 }, essay: { tile: 2, level: 1 } });
    assert.equal(run('state.unlocked.includes("summary")'), false);
    assert.equal(run('state.unlocked.includes("essay")'), true);
  });

  test('migration drops off-grade buildings and sessions handle empty pools gracefully', () => {
    const { run, get, json } = loadApp();
    run("state=migrate({v:5,grade:'4',g:9,coins:50,placed:{library:{tile:0,level:1},essay:{tile:1,level:1}},roads:[],decorations:[],progress:{},review:[],unlocked:['library']},'4')");
    assert.deepEqual(json('state.placed'), { library: { tile: 0, level: 1 } });
    assert.deepEqual(json('state.unlocked'), ['library', 'school', 'review']);
    run("state.placed.essay={tile:1,level:1}; updateUnlocks(state)");
    assert.equal(run('state.unlocked.includes("essay")'), false);
    assert.doesNotThrow(() => run("startSession('essay',false)"));
    assert.equal(run('session'), null);
    assert.equal(get('#scr-quiz').classList.contains('active'), false);
    run('renderMap()');
    assert.equal(get('#town-stats').textContent, '建物 1/6');
    run("activeGrade='pre2'; state=freshState('pre2'); renderMap()");
    assert.equal(get('#town-stats').textContent, '建物 0/8');
  });

  test('empty reading groups end the session attempt without errors', () => {
    const { run, get } = loadApp();
    run("state.coins=1000; BUILDINGS.forEach((b,i)=>confirmBuild(i,b.cat)); QUESTION_BANKS[state.grade].flower=QUESTION_BANKS[state.grade].flower.filter(q=>q.d!==1)");
    run("startSession('flower',false)");
    assert.equal(run('session'), null);
    assert.equal(get('#scr-quiz').classList.contains('active'), false);
    assert.match(get('#toast-root').children.at(-1).textContent, /問題が見つかりません/);
  });

  test('road rebuild disposes old meshes including instance buffers', () => {
    const { run } = loadApp();
    run(`R.roadsG={children:[{geometry:{dispose(){globalThis.__d=(globalThis.__d||0)+1}},dispose(){globalThis.__d=(globalThis.__d||0)+10}}]}`);
    run('rebuildRoads()');
    assert.equal(run('globalThis.__d'), 11);
    assert.equal(run('R.roadsG.children.length'), 0);
  });

  test('migration normalizes flags, names and numeric counters', () => {
    const { run, json } = loadApp();
    run("state=migrate({v:5,grade:'4',g:9,coins:12.7,totalCorrect:3.9,totalAnswered:1e10,townName:'あいうえおかきくけこさしすせそ',sound:'false',lowGfx:1,progress:{library:2.5,school:1e10},placed:{},roads:[],decorations:[],review:[],unlocked:['library']},'4')");
    assert.equal(run('state.coins'), 12);
    assert.equal(run('state.totalCorrect'), 3);
    assert.equal(run('state.totalAnswered'), 9999999);
    assert.equal(run('state.townName'), 'あいうえおかきくけこさし');
    assert.equal(run('state.sound'), true);
    assert.equal(run('state.lowGfx'), true);
    assert.deepEqual(json('state.progress'), { library: 2, school: 9999999 });
  });

  test('migration sanitizes decorations, remaps legacy tiles and drops collisions', () => {
    const { run, json } = loadApp();
    run("state=migrate({g:7,placed:{library:{tile:0,level:1}},roads:[1],decorations:[{tile:2,kind:'bench'},{tile:9,kind:'fountain'},{tile:16,kind:'lamp'},{tile:0,kind:'sign'},{tile:1,kind:'flowerbed'},{tile:2,kind:'lamp'},{tile:48,kind:'bench'},{tile:3,kind:'missing'},null,'x',{tile:4},{}]})");
    assert.deepEqual(json('state.decorations'), [{ tile: 2, kind: 'bench' }, { tile: 13, kind: 'fountain' }, { tile: 24, kind: 'lamp' }, { tile: 72, kind: 'bench' }]);
    assert.deepEqual(json('migrate({}).decorations'), []);
    assert.deepEqual(json("migrate({decorations:'nope'}).decorations"), []);
  });

  test('migration remaps 9-grid tiles onto the 11-grid', () => {
    const { run, json } = loadApp();
    assert.equal(run('GRID'), 11);
    run("state=migrate({g:9,placed:{library:{tile:0,level:1},school:{tile:80,level:2}},roads:[8,72],decorations:[{tile:40,kind:'bench'}]})");
    assert.deepEqual(json('state.placed'), { library: { tile: 0, level: 1 }, school: { tile: 96, level: 2 } });
    assert.deepEqual(json('state.roads'), [8, 88]);
    assert.deepEqual(json('state.decorations'), [{ tile: 48, kind: 'bench' }]);
    assert.equal(run('state.g'), 11);
  });

  test('city rebuild drops animations referencing removed objects', () => {
    const { run } = loadApp();
    run('R.ok=true; R.city={children:[]}; R.carsG={children:[]}; R.anims=[{obj:{removed:true},t:0}]; rebuildCity()');
    assert.equal(run('R.anims.length'), 0);
  });

  test('question banks have unique explicit ids with valid choices, samples and legacy indices', () => {
    const app = loadApp();
    const banks = app.json('QUESTION_BANKS');
    for (const [grade, cats] of Object.entries(banks)) {
      const ids = new Set();
      for (const [cat, qs] of Object.entries(cats)) {
        assert.ok(qs.length > 0, `${grade}/${cat} has questions`);
        qs.forEach((q, i) => {
          assert.match(q.id, new RegExp(`^g${grade}-${cat}-\\d{3}$`), `${q.id} naming`);
          assert.equal(ids.has(q.id), false, `duplicate id ${q.id}`);
          ids.add(q.id);
          assert.ok([1, 2, 3].includes(q.d), `${q.id} difficulty`);
          if (q.kind === 'listening') {
            assert.ok(Array.isArray(q.segments) && (q.segments.length > 0 || q.part === 'picture'), `${q.id} segments`);
            assert.ok(['response', 'dialogue', 'picture', 'passage'].includes(q.part), `${q.id} part`);
            assert.ok(Array.isArray(q.c) && [3, 4].includes(q.c.length), `${q.id} listening options`);
            assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < q.c.length, `${q.id} listening answer`);
            if (q.part === 'picture') assert.ok(typeof q.picture === 'string' && q.picture.startsWith('<svg'), `${q.id} picture svg`);
          } else if (q.kind === 'order-pair') {
            assert.ok(q.jp && Array.isArray(q.units) && q.units.length > 0 && Array.isArray(q.positions), `${q.id} order-pair fields`);
            assert.ok(Array.isArray(q.pairs) && q.pairs.length === 4 && q.pairs[q.a].join() === q.positions.map(p => q.order[p - 1]).join(), `${q.id} order-pair answer`);
          } else if (q.kind === 'reading') {
            assert.ok(q.passage && q.group && q.c.length === 4 && typeof q.e === 'string', `${q.id} reading fields`);
          } else if (q.say !== undefined) {
            assert.ok(q.say && (q.t === 'pic' || q.t === 'qa') && typeof q.e === 'string', `${q.id} listening fields`);
            assert.ok((q.t === 'pic' ? q.s.length === 4 : q.q && q.s.length === 4), `${q.id} listening options`);
            assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < q.s.length, `${q.id} listening answer`);
          } else if (q.words) {
            assert.ok(q.jp && q.words.length > 0 && typeof q.e === 'string', `${q.id} order fields`);
          } else if (q.kind === 'summary') {
            assert.ok(q.passage && q.en && q.jp && Array.isArray(q.hints) && q.hints.length > 0 && typeof q.sample === 'string', `${q.id} summary fields`);
          } else if (q.en) {
            assert.ok(q.en && q.jp && Array.isArray(q.hints) && q.hints.length > 0 && typeof q.sample === 'string', `${q.id} writing fields`);
            if (grade === '5') assert.ok(q.e && /本番の英作文ではありません/.test(q.jp), `${q.id} supplemental notice`);
          } else if (q.q !== undefined) {
            assert.ok(q.q.length > 0 && Array.isArray(q.c) && q.c.length === 4, `${q.id} choices`);
            assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < 4, `${q.id} answer index`);
            assert.ok(new Set(q.c).size === q.c.length, `${q.id} unique choices`);
            assert.ok(typeof q.e === 'string' && q.e.length > 0, `${q.id} explanation`);
          } else {
            assert.fail(`${q.id} unknown shape`);
          }
          if (grade === '4' && q.legacyIndex !== undefined) assert.equal(q.legacyIndex, i, `${q.id} legacyIndex matches position`);
        });
      }
      assert.equal(ids.size, Object.values(cats).flat().length, `${grade} unique ids`);
    }
  });

  test('corrected grade4 choices retain ids, legacy indices, difficulty and explanations', () => {
    const app = loadApp();
    const cases = [
      ['library', 'g4-library-016', 15, 1, ['on', 'in', 'under', 'for'], '米国英語では on weekends。英国英語では at weekends とも言う。ここでは on を選ぶ。'],
      ['school', 'g4-school-010', 9, 1, ['beautiful', 'beautifully', 'beauty', 'beautify'], '名詞 bag を説明するのは形容詞 beautiful。beautifully は動詞を修飾する副詞。'],
      ['school', 'g4-school-024', 23, 2, ['Does', 'Do', 'Is', 'Are'], 'your brother は三人称単数。Does ではじめたら動詞は原形 like へ。'],
      ['school', 'g4-school-038', 37, 3, ['Everything', 'Every', 'Everybody are', 'Every things'], 'Everything は「すべてのもの・こと」で単数扱い。Everything is の形で使う。']
    ];
    for (const [cat, id, legacyIndex, d, c, e] of cases) {
      const question = app.json(`REVIEW_ARCHIVE['4']['${cat}'].find(q => q.id === '${id}')`);
      assert.deepEqual({ id: question.id, legacyIndex: question.legacyIndex, d: question.d, c: question.c, a: question.a, e: question.e }, { id, legacyIndex, d, c, a: 0, e });
    }
  });

  test('save export produces re-importable JSON and import overwrites with confirmation', () => {
    const { run, get, json, storage } = loadApp();
    run("confirmBuild(0,'library'); state.coins=77; save()");
    run('globalThis.__exp=exportSaveJSON()');
    const exported = run('globalThis.__exp');
    assert.equal(typeof exported, 'string');
    assert.deepEqual(JSON.parse(exported), JSON.parse(storage.get('eikenTownSave_v1')));
    assert.deepEqual(json('validateImportedSave(JSON.parse(globalThis.__exp)).towns["4"].placed'), { library: { tile: 0, level: 1 } });
    run("state.coins=5; state.townName='別'");
    const before = storage.get('eikenTownSave_v1');
    run('importSaveFromText(globalThis.__exp)');
    get('#yn-no').click();
    assert.equal(json('state.coins'), 5);
    assert.equal(storage.get('eikenTownSave_v1'), before);
    run('importSaveFromText(globalThis.__exp)');
    get('#yn-yes').click();
    assert.equal(run('state.coins'), 77);
    assert.equal(run('state.townName'), '');
    assert.deepEqual(json('state.placed'), { library: { tile: 0, level: 1 } });
    assert.equal(get('#scr-title').classList.contains('active'), true);
  });

  test('save import rejects malformed payloads without changing state', () => {
    const { run, get, json, storage } = loadApp();
    run("confirmBuild(0,'library'); save()");
    const beforeState = json('state');
    const beforeBytes = storage.get('eikenTownSave_v1');
    for (const bad of ['not json', '{"v":4}', '{"v":5}', '{"v":5,"towns":[]}', '{"v":5,"towns":{}}', '{"v":5,"towns":{"9":{}}}', '{"v":5,"towns":{"4":null}}']) {
      assert.equal(run(`importSaveFromText(${JSON.stringify(bad)})`), false);
    }
    assert.deepEqual(json('state'), beforeState);
    assert.equal(storage.get('eikenTownSave_v1'), beforeBytes);
    assert.equal(get('#yn-yes'), null);
  });

  test('save transfer is blocked during quizzes and broken saves, settings exposes buttons', () => {
    const { run, get } = loadApp();
    run("confirmBuild(0,'library'); save()");
    run('globalThis.__exp=exportSaveJSON()');
    run("startSession('library',false)");
    assert.equal(run('importSaveFromText(globalThis.__exp)'), false);
    assert.equal(run('state.coins'), 50);
    run('goHome()');
    get('#yn-yes').click();
    run('openSettings()');
    assert.ok(get('#st-export'));
    assert.ok(get('#st-import'));
    assert.ok(get('#st-import-file'));
  });

  test('save export on empty storage reports no data', () => {
    const { run, get } = loadApp();
    assert.equal(run('exportSaveJSON()'), null);
    run('exportSave()');
    assert.match(get('#toast-root').children.at(-1).textContent, /まだありません/);
  });

  test('title screen can start from a transferred save file', () => {
    const src = loadApp();
    src.run("confirmBuild(0,'library'); state.coins=77; save()");
    const exported = src.run('exportSaveJSON()');
    assert.equal(typeof exported, 'string');
    const dst = loadApp();
    assert.equal(dst.get('#start-btn').textContent, 'はじめる!');
    assert.ok(dst.get('#import-btn-title'));
    assert.ok(dst.get('#title-import-file'));
    assert.equal(typeof dst.get('#import-btn-title').onclick, 'function');
    dst.run(`importSaveFromText(${JSON.stringify(exported)})`);
    dst.get('#yn-yes').click();
    assert.equal(dst.run('state.coins'), 77);
    assert.deepEqual(dst.json('state.placed'), { library: { tile: 0, level: 1 } });
    assert.equal(dst.get('#start-btn').textContent, 'つづきから!');
    assert.equal(dst.get('#scr-title').classList.contains('active'), true);
  });

  test('mobile readability uses mobile-only breaks in long explanations', () => {
    const html = readFileSync(join(__dirname, 'eiken-town.html'), 'utf8');
    const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
    assert.match(css, /br\.mbr\{display:none\}/);
    assert.match(css, /br\.wbr\{display:block\}/);
    assert.match(css, /@media\(max-width:480px\)\{[\s\S]*?br\.mbr\{display:block\}/);
    assert.match(css, /@media\(max-width:480px\)\{[\s\S]*?br\.wbr\{display:none\}/);
    assert.match(css, /@media\(max-width:480px\)\{[\s\S]*?\.modal \.sub\{[^}]*line-height/);
    const app = loadApp();
    for (const page of app.json('TUT')) {
      assert.match(page.d, /<br class="mbr">/);
      assert.match(page.d, /<br class="wbr">/);
    }
    assert.match(app.run('flowerGuide("4")'), /<br class="mbr">/);
    assert.match(app.run('flowerGuide("5")'), /<br class="mbr">/);
    assert.match(app.run('flowerGuide("4")'), /<br class="wbr">/);
    assert.match(app.run('flowerGuide("5")'), /<br class="wbr">/);
  });

  test('level-up tutorial describes practice without claiming exam equivalence', () => {
    const app = loadApp();
    const description = app.run("TUT.find(page => page.t === 'レベルアップで成長').d");
    assert.match(description, /少し難しい練習問題/);
    assert.doesNotMatch(description, /本番そっくりの難しい問題/);
  });

  test('legacy v3/v4 saves import to grade4 with legacyIndex lookup surviving bank reorder', () => {
    const storage = new Map();
    const app = loadApp({ storage, beforeApp: 'QUESTION_BANKS["4"].library.reverse()' });
    app.run('state=migrate({v:3,g:5,coins:120,placed:{library:{tile:0,level:1}},progress:{library:4},review:["library:0","library:39"],roads:[]},"4")');
    assert.deepEqual(app.json('state.review'), ['g4-library-001', 'g4-library-040']);
    assert.equal(app.run('state.v'), 5);
    assert.equal(app.run('state.grade'), '4');
    app.run('save()');
    const env = JSON.parse(storage.get('eikenTownSave_v1'));
    assert.equal(env.v, 5);
    assert.deepEqual(Object.keys(env.towns), ['4']);
    const reloaded = loadApp({ storage });
    assert.deepEqual(reloaded.json('state.review'), ['g4-library-001', 'g4-library-040']);
    assert.equal(reloaded.run('state.placed.library.level'), 1);
  });

  test('v5 envelope rejects legacy ids and foreign grade ids in review', () => {
    const { run, json } = loadApp();
    run('state=migrate({v:5,grade:"4",coins:80,placed:{library:{tile:0,level:1}},review:["school:0","g5-school-001","g4-school-001",7,null,"g4-nope-999"]},"4")');
    assert.deepEqual(json('state.review'), ['g4-school-001']);
  });

  test('grade cards expose synchronized accessible state on title and every settings render', () => {
    const app = loadApp();
    assertGradeCards(app, '#title-grade', '4');
    app.get('#title-grade [data-grade="5"]').focus();
    app.get('#title-grade [data-grade="5"]').click();
    assertGradeCards(app, '#title-grade', '5');
    assert.equal(app.document.activeElement, app.get('#title-grade [data-grade="5"]'));
    assert.equal(app.get('#active-grade').textContent, '5級');
    assert.equal(app.get('#quiz-grade').textContent, '5級');
    assert.equal(app.get('#start-btn').textContent, 'はじめる!');
    assert.equal(app.get('#reset-btn-top').classList.contains('hidden'), true);
    app.get('#settings-btn').click();
    assertGradeCards(app, '#settings-grade', '5');
    app.get('#st-sound').click();
    assertGradeCards(app, '#settings-grade', '5');
    app.get('#st-gfx').click();
    assertGradeCards(app, '#settings-grade', '5');
    assertGradeCards(app, '#title-grade', '5');
    const reloaded = loadApp({ storage: app.storage });
    assertGradeCards(reloaded, '#title-grade', '5');
    assert.equal(reloaded.get('#start-btn').textContent, 'つづきから!');
    assert.equal(reloaded.get('#reset-btn-top').classList.contains('hidden'), false);
  });

  test('mobile appbar wraps without shrinking or clipping the coin count', () => {
    const html = readFileSync(join(__dirname, 'eiken-town.html'), 'utf8');
    const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
    const mobile = css.match(/@media\(max-width:600px\)\{([\s\S]*?)\n\}/)[1];
    assert.match(mobile, /\.appbar\{[^}]*flex-wrap:wrap/);
    assert.match(mobile, /\.appbar \.logo-mini\{[^}]*font-size:0/);
    assert.match(mobile, /\.appbar \.pill,\.appbar \.iconbtn\{flex-shrink:0\}/);
    assert.doesNotMatch(css, /#coin-pill\{[^}]*(?:max-width|overflow:hidden)/);
  });

  test('grade card styles provide large targets, visible focus and shrinkable narrow layouts', () => {
    const html = readFileSync(join(__dirname, 'eiken-town.html'), 'utf8');
    const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
    const cards = [...css.matchAll(/\.grade-card\{([^}]+)\}/g)];
    assert.ok(cards.length >= 2);
    for (const [, rule] of cards) assert.ok(Number(rule.match(/min-height:(\d+)px/)[1]) >= 64);
    assert.match(css, /\.grade-selector\{[^}]*width:100%[^}]*min-width:0/);
    assert.match(css, /\.grade-card\{[^}]*min-width:0[^}]*overflow-wrap:anywhere/);
    assert.match(css, /\.grade-options\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(css, /@media\(max-width:480px\)\{\.grade-options\{grid-template-columns:minmax\(0,1fr\)/);
    assert.match(css, /\.grade-card:focus-visible\{outline:4px solid [^;]+;outline-offset:4px/);
    assert.match(css, /\.grade-card\[aria-pressed="true"\]\{[^}]*border-color:[^;]+;background:/);
  });

  for (const grade of ['4', '5', '3', 'pre2', '2', 'pre1']) {
    test(`settings card clicks from grade ${grade} preserve saves through same-grade, cancel and accept`, () => {
      const app = loadApp();
      const other = grade === '4' ? '5' : '4';
      app.run(`activeGrade='${grade}'; state=freshState(activeGrade); confirmBuild(0,'library'); towns['${other}']=freshState('${other}'); towns['${other}'].coins=91; towns['${other}'].townName='別の街'; startSession('library',false)`);
      app.get('.choice[data-ok="true"]').click();
      const state = app.json('state');
      const session = app.run('session');
      const bytes = app.storage.get('eikenTownSave_v1');
      app.get('#settings-btn').click();
      assertGradeCards(app, '#settings-grade', grade);
      app.get(`#settings-grade [data-grade="${grade}"]`).click();
      assert.equal(app.get('#yn-yes'), null);
      assert.equal(app.run('session'), session);
      assertGradeCards(app, '#settings-grade', grade);
      app.get(`#settings-grade [data-grade="${other}"]`).click();
      assert.equal(app.get('#modal-root').classList.contains('open'), true);
      assertGradeCards(app, '#title-grade', grade);
      assert.equal(app.run('session'), session);
      assert.equal(app.storage.get('eikenTownSave_v1'), bytes);
      const staleAccept = app.get('#yn-yes').onclick;
      app.get('#yn-no').click();
      staleAccept();
      assert.equal(app.run('activeGrade'), grade);
      assert.equal(app.run('session'), session);
      assert.deepEqual(app.json('state'), state);
      assert.equal(app.storage.get('eikenTownSave_v1'), bytes);
      assert.equal(app.get('#scr-quiz').classList.contains('active'), true);
      app.get('#settings-btn').click();
      assertGradeCards(app, '#settings-grade', grade);
      app.get(`#settings-grade [data-grade="${other}"]`).click();
      app.get('#yn-yes').click();
      assert.equal(app.run('session'), null);
      assert.equal(app.run('activeGrade'), other);
      assert.equal(app.run('state.coins'), 91);
      assert.equal(app.get('#scr-town').classList.contains('active'), true);
      assertGradeCards(app, '#settings-grade', other);
      assertGradeCards(app, '#title-grade', other);
      assert.equal(app.get('#active-grade').textContent, other + '級');
      assert.equal(app.get('#quiz-grade').textContent, other + '級');
      const saved = JSON.parse(app.storage.get('eikenTownSave_v1'));
      assert.deepEqual(saved.towns[grade], state);
      assert.equal(saved.towns[other].coins, 91);
      app.get(`#settings-grade [data-grade="${grade}"]`).click();
      assertGradeCards(app, '#settings-grade', grade);
      assert.deepEqual(app.json('state'), state);
    });
  }

  test('default startup starts at grade 4 with empty storage', () => {
    const { run, get, json } = loadApp();
    assert.equal(run('state.grade'), '4');
    assert.equal(run('activeGrade'), '4');
    assert.equal(get('#title-grade [data-grade="4"]').getAttribute('aria-pressed'), 'true');
    assert.equal(get('#active-grade').textContent, '4級');
    assert.equal(get('#start-btn').textContent, 'はじめる!');
    assert.equal(run('freshStart'), true);
    assert.deepEqual(json('Object.keys(towns)'), []);
    run('save()');
    const env = json('JSON.parse(localStorage.getItem(SAVE_KEY))');
    assert.equal(env.v, 5);
    assert.equal(env.activeGrade, '4');
    assert.deepEqual(Object.keys(env.towns), ['4']);
  });

  test('grade switch keeps towns independent across switches and reloads', () => {
    const storage = new Map();
    const app = loadApp({ storage });
    app.run('state.coins=500; confirmBuild(0,"library"); state.progress.library=6; state.review=["g4-school-001"]; state.townName="よんまる"');
    app.run('document.querySelector("#title-grade [data-grade=5]").click()');
    app.run('document.querySelector("#start-btn").click()');
    app.run('document.querySelector("#nm-input").value="ゴーマル"');
    app.run('document.querySelector("#nm-ok").click()');
    assert.equal(app.run('state.townName'), 'ゴーマル');
    assert.equal(app.run('state.coins'), 50, 'fresh grade5 funds');
    assert.deepEqual(app.json('state.placed'), {}, 'fresh grade5 buildings');
    app.run('confirmBuild(0,"library"); state.progress.library=2');
    const saved4 = JSON.parse(storage.get('eikenTownSave_v1'));
    assert.equal(saved4.towns['4'].townName, 'よんまる');
    assert.equal(saved4.towns['4'].progress.library, 6);
    app.run('goHome()');
    app.run('document.querySelector("#title-grade [data-grade=4]").click()');
    app.get('#start-btn').click();
    assert.equal(app.run('state.townName'), 'よんまる', 'grade4 resumed');
    assert.equal(app.run('state.coins'), 500, 'grade4 funds preserved');
    assert.deepEqual(app.json('state.review'), ['g4-school-001'], 'grade4 review preserved');
    assert.equal(app.run('state.progress.library'), 6, 'grade4 progress preserved');
    assert.equal(app.run('state.placed.library.level'), 1, 'grade4 buildings preserved');
    const reloaded = loadApp({ storage });
    reloaded.get('#start-btn').click();
    assert.equal(reloaded.run('activeGrade'), '4');
    assert.equal(reloaded.run('state.townName'), 'よんまる');
    assert.equal(reloaded.run('state.progress.library'), 6);
    reloaded.run('document.querySelector("#title-grade [data-grade=5]").click()');
    reloaded.get('#start-btn').click();
    assert.equal(reloaded.run('state.townName'), 'ゴーマル');
    assert.equal(reloaded.run('state.progress.library'), 2, 'grade5 progress independent');
    assert.equal(reloaded.run('state.coins'), 50, 'grade5 funds independent');
  });

  test('switching during an active quiz confirms, cancel keeps session, accept discards it and silences audio', () => {
    const storage = new Map();
    const app = loadApp({ storage });
    app.run('state.coins=1000; BUILDINGS.forEach((b,i)=>confirmBuild(i,b.cat))');
    app.run('startSession("park",false)');
    app.run('recordResult(true,5,"q")');
    const before = app.json('session');
    app.run('document.querySelector("#title-grade [data-grade=5]").click()');
    assert.equal(app.get('#yn-yes') !== null, true, 'confirmation shown');
    assert.deepEqual(app.json('session'), before, 'session kept on confirm');
    assert.equal(app.run('activeGrade'), '4');
    app.get('#yn-no').click();
    assert.deepEqual(app.json('session'), before, 'cancel keeps session');
    assert.equal(app.run('activeGrade'), '4');
    const timer = [...app.timers.values()].find(timer => timer.delay === 350);
    assert.ok(timer, 'pending speech timer exists');
    app.run('document.querySelector("#title-grade [data-grade=5]").click()');
    app.get('#yn-yes').click();
    assert.equal(app.run('session'), null, 'accept discards session');
    assert.equal(app.run('activeGrade'), '5');
    app.flushTimers(350);
    assert.equal(app.spoken.length, 0, 'no stale speech');
    app.run('document.querySelector("#start-btn").click()');
    assert.equal(app.get('#nm-input') !== null, true, 'fresh grade gets naming');
  });

  test('reset removes only the current grade and never resurrects old saves on reload', () => {
    const storage = new Map();
    const app = loadApp({ storage });
    app.run('state.coins=500; confirmBuild(0,"library"); state.townName="よんまる"');
    app.run('document.querySelector("#title-grade [data-grade=5]").click()');
    app.run('document.querySelector("#start-btn").click()');
    app.run('document.querySelector("#nm-input").value="ゴーマル"');
    app.run('document.querySelector("#nm-ok").click()');
    app.run('goHome()');
    app.run('wipeAndRestart()');
    const env = JSON.parse(storage.get('eikenTownSave_v1'));
    assert.equal(env.activeGrade, '5');
    assert.equal(env.towns['5'], undefined, 'grade5 town removed');
    assert.equal(env.towns['4'].townName, 'よんまる', 'grade4 town kept');
    app.run('document.querySelector("#start-btn").click()');
    assert.equal(app.get('#nm-input') !== null, true, 'grade5 restarts naming');
    const reloaded = loadApp({ storage });
    assert.equal(reloaded.run('activeGrade'), '5');
    assert.equal(reloaded.run('state.townName'), '', 'grade5 stays fresh');
    assert.deepEqual(reloaded.json('Object.keys(towns)'), ['4'], 'old save not resurrected');
  });

  test('storage save failures are visible, retryable and never discard in-memory towns', () => {
    const storage = new Map();
    let failing = true;
    const app = loadApp({ storage, storageErrors: { get write() { return failing; } } });
    app.run('confirmBuild(0,"library"); save()');
    assert.equal(app.get('#save-error').classList.contains('hidden'), false, 'error banner visible');
    assert.equal(app.run('state.placed.library.tile'), 0, 'in-memory state kept');
    assert.equal(app.get('#save-error').textContent.includes('保存できませんでした'), true);
    failing = false;
    app.run('persistTowns()');
    assert.equal(app.get('#save-error').classList.contains('hidden'), true, 'error clears after retry');
    assert.equal(JSON.parse(storage.get('eikenTownSave_v1')).towns['4'].placed.library.tile, 0);
  });

  test('grade5 sessions cover all categories with lengths, no dupes and valid fields', () => {
    const { run, json } = loadApp();
    run('state.grade="5"; state.coins=1000; BUILDINGS.forEach((b,i)=>confirmBuild(i,b.cat))');
    for (const cat of ['library', 'school', 'cafe', 'station', 'park']) {
      run(`startSession('${cat}',false)`);
      assert.equal(json('session.grade'), '5');
      assert.equal(json('session.qs.length'), 5, `${cat} length`);
      assert.equal(run(`new Set(session.qs.map(item=>item.id)).size===5&&session.qs.every(item=>item.id.startsWith('g5-${cat}-')&&item.q.d>=1&&item.q.d<=3)`), true, `${cat} ids`);
      run('goHome()');
      run("document.querySelector('#yn-yes').click()");
    }
    run('startReview()');
    assert.equal(run('state.review.length'), 0, 'no review recorded without wrong answers');
    run("state.review=['g5-library-001','g5-library-001','g5-park-003']; startSession(null,true)");
    assert.deepEqual([...json('session.qs.map(item=>item.id)')].sort(), ['g5-library-001', 'g5-park-003'], 'review dedupes and resolves ids');
  });

  test('review recording uses fixed ids independent of array position', () => {
    const { run, json } = loadApp();
    run('state.coins=1000; confirmBuild(0,"library"); startSession("library",false)');
    run('const target=session.qs[0].id; recordResult(false,5,"wrong")');
    assert.deepEqual(json('state.review'), json('[session.qs[0].id]'));
    assert.equal(run("state.review[0]===session.qs[0].id"), true);
    assert.equal(run("state.review[0].includes(':')"), false, 'no index-based ids');
  });

  test('storage read failure blocks gameplay and writes, retry loads original bytes without loss', () => {
    const storage = new Map();
    storage.set('eikenTownSave_v1', JSON.stringify({ v: 5, activeGrade: '4', towns: { '4': { v: 5, grade: '4', coins: 333, townName: 'よみがえる町', placed: { library: { tile: 3, level: 2 } }, progress: { library: 9 }, review: ['g4-school-005'], unlocked: ['library'], roads: [], totalCorrect: 9, totalAnswered: 12, sound: true, lowGfx: false, g: 7 } } }));
    const app = loadApp({ storage, storageErrors: { read: true } });
    const { run, get, json } = app;
    assert.equal(run('loadBlocked'), true, 'load blocked');
    assert.equal(get('#save-error').classList.contains('hidden'), false, 'error visible');
    assert.match(get('#save-error').textContent, /読み込みに失敗/);
    assert.equal(json('state.coins'), 50, 'placeholder state not treated as loaded save');
    assert.deepEqual(json('Object.keys(towns)'), [], 'no towns from failed read');
    const originalBytes = storage.get('eikenTownSave_v1');
    run('confirmBuild(0,"library"); save(); openNaming(true); document.querySelector("#nm-input").value="むりなの"; document.querySelector("#nm-ok").click()');
    assert.equal(run('loadBlocked'), true);
    assert.equal(storage.has('eikenTownSave_v1'), true);
    assert.equal(storage.get('eikenTownSave_v1'), originalBytes, 'original bytes untouched');
    assert.equal(run('state.townName'), '', 'naming blocked while load-blocked');
    assert.equal(run('state.placed.library'), undefined, 'building blocked while load-blocked');
    run('switchGrade("5")');
    assert.equal(run('activeGrade'), '4', 'grade switch blocked');
    run('wipeAndRestart()');
    assert.equal(storage.get('eikenTownSave_v1'), originalBytes, 'reset blocked');
    assert.equal(get('#save-error').classList.contains('hidden'), false, 'error persists');
    app.readErrors.current = false;
    get('#save-retry').click();
    assert.equal(run('loadBlocked'), false, 'retry resolves block');
    assert.equal(run('state.townName'), 'よみがえる町', 'retry restores loaded save');
    assert.equal(json('state.coins'), 333);
    assert.deepEqual(json('state.placed'), { library: { tile: 3, level: 2 } });
    assert.deepEqual(json('state.review'), ['g4-school-005']);
    assert.equal(get('#save-error').classList.contains('hidden'), true, 'error cleared');
    assert.equal(run('freshStart'), false);
    run('confirmBuild(0,"library"); save()');
    assert.equal(JSON.parse(storage.get('eikenTownSave_v1')).towns['4'].coins, 333, 'writes allowed after recovery');
  });

  for (const envelope of [null, '"junk"', '{"v":6,"towns":{},"activeGrade":"4"}', '{"v":"5","towns":{}}', '{"towns":{},"activeGrade":"4"}', '{"v":5}', '{"v":99,"towns":{"4":{"v":5}}}', '{"v":5,"activeGrade":"4","towns":{"4":null}}', '{"v":5,"activeGrade":"4","towns":{"4":{"grade":"4"}}}']) {
    test(`malformed envelope ${JSON.stringify(envelope).slice(0, 28)} blocks overwrites and preserves bytes`, () => {
      const bytes = JSON.stringify(envelope);
      const storage = new Map([['eikenTownSave_v1', bytes]]);
      const app = loadApp({ storage });
      const { run, get } = app;
      assert.equal(run('loadBlocked'), true, 'blocked');
      assert.equal(get('#save-error').classList.contains('hidden'), false);
      assert.equal(run('legacyLoaded'), false, 'no silent legacy import');
      const untouched = () => assert.equal(storage.get('eikenTownSave_v1'), bytes, 'bytes preserved');
      untouched();
      run('confirmBuild(0,"library"); save()');
      untouched();
      run('persistTowns()');
      untouched();
      run('switchGrade("5")');
      untouched();
      assert.equal(run('activeGrade'), '4', 'switch blocked');
      run('wipeAndRestart()');
      untouched();
      app.readErrors.current = true;
      get('#save-retry').click();
      untouched();
      assert.equal(run('loadBlocked'), true, 'still blocked after retry');
      app.readErrors.current = false;
      run('document.querySelector("#start-btn").click()');
      untouched();
      assert.equal(run('state.townName'), '', 'start/editing blocked');
    });
  }

  test('valid v5 envelope loads normally after malformed ones are rejected', () => {
    const storage = new Map([['eikenTownSave_v1', '{"v":6}']]);
    let app = loadApp({ storage });
    assert.equal(app.run('loadBlocked'), true);
    storage.set('eikenTownSave_v1', JSON.stringify({ v: 5, activeGrade: '5', towns: { '5': { v: 5, grade: '5', coins: 77, townName: 'ごーまる', placed: { library: { tile: 1, level: 1 } }, progress: {}, review: [], unlocked: ['library'], roads: [], sound: true, lowGfx: false, g: 7 } } }));
    app.get('#save-retry').click();
    assert.equal(app.run('loadBlocked'), false);
    assert.equal(app.run('activeGrade'), '5');
    assert.equal(app.run('state.townName'), 'ごーまる');
    assert.equal(app.run('state.coins'), 77);
    app.run('save()');
    const env = JSON.parse(storage.get('eikenTownSave_v1'));
    assert.equal(env.v, 5, 'subsequent write is correct v5 envelope');
    assert.deepEqual(Object.keys(env.towns), ['5']);
  });

  test('legacy archive review resolves fixed ids and legacyIndex mapping surviving reorder', () => {
    const storage = new Map();
    const app = loadApp({ storage, beforeApp: 'REVIEW_ARCHIVE["4"].library.reverse()' });
    app.run('state=migrate({v:4,coins:60,review:["library:0","library:39"]},"4")');
    assert.deepEqual(app.json('state.review'), ['g4-library-001', 'g4-library-040']);
    const first = app.json('REVIEW_ARCHIVE[\'4\'].library.find(q=>q.id===\'g4-library-001\')');
    const last = app.json('REVIEW_ARCHIVE[\'4\'].library.find(q=>q.id===\'g4-library-040\')');
    assert.equal(first.legacyIndex, 0);
    assert.equal(last.legacyIndex, 39);
    assert.equal(app.get('.choice'), null, 'no review UI before starting review');
    assert.equal(app.get('.choice'), null, 'no legacy render before review starts');
    const active = app.json('QUESTION_BANKS[\'4\'].library.map(q=>q.id)');
    assert.equal(active.includes('g4-library-001'), false, 'active pool has no archived ids');
  });

  test('grade4 flower reading sessions use one grouped passage, show it in review and record wrong ids', () => {
    const app = loadApp();
    const { run, get, json } = app;
    run("state.coins=1000; BUILDINGS.forEach((b,i)=>confirmBuild(i,b.cat)); state.placed.flower.level=3; startSession('flower',false)");
    assert.equal(run('session.qs.length'), 5);
    assert.equal(run('new Set(session.qs.map(item=>item.q.group)).size'), 1, 'single group');
    assert.equal(run('session.qs.every(item=>questionKind(item.q)==="reading")'), true);
    const passage = run('session.qs[0].q.passage');
    assert.equal(get('.reading-passage').textContent, passage);
    const ids = json('session.qs.map(item=>item.id)');
    get('.choice[data-ok="false"]').click();
    get('#fb-next').click();
    assert.deepEqual(json('state.review'), json('session.qs.slice(0,1).map(item=>item.id)'));
    assert.equal(run('state.progress.flower'), 0, 'wrong answer records no progress');
    get('.choice[data-ok="true"]').click();
    get('#fb-next').click();
    assert.equal(run('state.progress.flower'), 1, 'reading counts toward flower progress');
    run('session.results[2]=true;session.results[3]=true;session.i=4;renderQuestion()');
    get('.choice[data-ok="true"]').click();
    get('#fb-next').click();
    assert.equal(get('#scr-result').classList.contains('active'), true);
    run(`state.review=${JSON.stringify(ids)}; startReview()`);
    assert.equal(get('.reading-passage').textContent, passage, 'review shows self-contained passage');
  });

  test('grade3 flower reading sessions use one grouped passage and record wrong ids', () => {
    const app = loadApp();
    const { run, get, json } = app;
    run("activeGrade='3'; state=freshState('3'); state.coins=1000; BUILDINGS.forEach((b,i)=>confirmBuild(i,b.cat)); state.placed.flower.level=2; startSession('flower',false)");
    assert.equal(run('session.grade'), '3');
    assert.equal(run('session.qs.length'), 3);
    assert.equal(run('new Set(session.qs.map(item=>item.q.group)).size'), 1, 'single group');
    assert.equal(run('session.qs.every(item=>questionKind(item.q)==="reading")'), true);
    assert.equal(run('session.qs.every(item=>item.id.startsWith("g3-flower-"))'), true);
    const passage = run('session.qs[0].q.passage');
    assert.equal(get('.reading-passage').textContent, passage);
    get('.choice[data-ok="false"]').click();
    get('#fb-next').click();
    assert.deepEqual(json('state.review'), json('session.qs.slice(0,1).map(item=>item.id)'));
  });

  test('order questions assemble into the sentences quoted in explanations', () => {
    const app = loadApp();
    for (const grade of ['4', '5', '3', 'pre2', '2']) {
      for (const q of app.json(`QUESTION_BANKS['${grade}'].station`)) {
        const full = (q.prefix + ' ' + q.order.map(n => q.units[n - 1]).join(' ') + ' ' + q.suffix).replace(/\s+/g, ' ').replace(/\s+([.,?!])/g, '$1').trim();
        const quoted = q.e.split(' の順')[0].trim();
        assert.equal(full, quoted, `${q.id} assembly`);
      }
    }
  });

  test('summary sessions show the passage with word target and record no review', () => {
    const app = loadApp();
    const { run, get, json } = app;
    run("activeGrade='2'; state=freshState('2'); state.coins=2000; BUILDINGS.forEach((b,i)=>confirmBuild(i,b.cat)); startSession('summary',false)");
    assert.equal(run('session.cat'), 'summary');
    assert.equal(run('session.qs.length'), 1);
    assert.equal(run('questionKind(session.qs[0].q)'), 'summary');
    assert.match(get('#q-card').textContent, /要約/);
    assert.ok(get('.reading-passage'));
    assert.match(get('#q-card').textContent, /45〜55語/);
    assert.match(run('writingChecks("2",true)[0]'), /自分の言葉/);
    run("exitPlace(); closeModal(); goHome(); activeGrade='pre2'; state=freshState('pre2'); state.coins=2000; BUILDINGS.forEach((b,i)=>confirmBuild(i,b.cat)); startSession('summary',false)");
    assert.equal(run('session.qs.length'), 1);
    assert.match(get('#q-card').textContent, /25〜35語/);
    const box = get('#wr-box');
    box.value = 'Many Japanese drink coffee every morning. Coffee was first found in Africa long ago and carried to many countries. Today, Brazil grows the most coffee. There are many coffee shops in towns. Some like hot coffee, others iced. Drinking it with friends is popular on weekends. I like iced coffee very much in summer.';
    box.dispatchEvent({ type: 'input' });
    get('#wr-submit').click();
    for (const input of get('#wr-checks').querySelectorAll('input')) {
      input.checked = true;
      input.dispatchEvent({ type: 'change' });
    }
    get('#wr-done').click();
    assert.equal(run('session.coinsEarned') > 0, true);
    assert.deepEqual(json('state.review'), []);
  });

  test('reading answers are grounded in their passages except listed inference questions', () => {
    const app = loadApp();
    const stop = new Set('this,that,with,from,they,have,what,when,where,there,here,will,would,should,could,your,about,into,over,after,before,than,then,also,just,only,very,more,most,some,such,same,other,each,them,been,were,has,had,does,doing,done'.split(','));
    const allowed = new Set(['g4-flower-108', 'gpre2-flower-101']);
    for (const grade of ['4', '3', 'pre2', '2', 'pre1']) {
      for (const q of app.json(`QUESTION_BANKS['${grade}'].flower`)) {
        if (allowed.has(q.id)) continue;
        const words = q.c[q.a].replace(/[^a-zA-Z ]/g, '').toLowerCase().split(' ').filter(w => w.length >= 4 && !stop.has(w));
        assert.ok(words.some(w => q.passage.toLowerCase().includes(w)), `${q.id} grounded`);
      }
    }
  });

  test('grade-2 banks hold full practice sets with grouped reading passages', () => {
    const app = loadApp();
    assert.deepEqual(app.json(`['library','school','cafe','station','park'].map(c=>QUESTION_BANKS['2'][c].length)`), [18, 18, 18, 18, 18]);
    assert.equal(app.run(`QUESTION_BANKS['2'].flower.length`), 20);
    assert.deepEqual(app.json(`[...new Set(QUESTION_BANKS['2'].flower.map(q=>q.group))].sort()`), ['g2-reading-email-1', 'g2-reading-email-2', 'g2-reading-notice-1', 'g2-reading-notice-2', 'g2-reading-story-1', 'g2-reading-story-2']);
    assert.equal(app.run(`QUESTION_BANKS['2'].station.every(q=>q.positions.join()==='2,4')`), true);
    assert.equal(app.run(`['response','dialogue','passage'].every(part=>QUESTION_BANKS['2'].park.filter(q=>q.part===part).length===6)`), true);
    assert.equal(app.run(`QUESTION_BANKS['2'].essay.length`), 6);
    assert.equal(app.run(`QUESTION_BANKS['2'].summary.length`), 6);
    assert.equal(app.run(`QUESTION_BANKS['2'].essay.filter(q=>q.kind==='writing').every(q=>q.points.length===3)`), true);
    assert.equal(app.run(`QUESTION_BANKS['2'].essay.every(q=>{const n=wordCount(q.sample);return n>=80&&n<=100})`), true);
    assert.equal(app.run(`QUESTION_BANKS['2'].summary.every(q=>{const n=wordCount(q.sample);return n>=45&&n<=55})`), true);
    assert.deepEqual(app.json('WRITING_RANGE["2"]'), [80, 100]);
    assert.match(app.run('writingChecks("2")[0]'), /80〜100語/);
    assert.equal(app.run('gradeLabel("2")'), '2級');
  });

  test('grade-2 essay submission records coins without review entries', () => {
    const app = loadApp();
    const { run, get, json } = app;
    run("activeGrade='2'; state=freshState('2'); state.coins=1000; BUILDINGS.forEach((b,i)=>confirmBuild(i,b.cat)); QUESTION_BANKS['2'].essay=QUESTION_BANKS['2'].essay.filter(q=>q.kind==='writing'); startSession('essay',false)");
    assert.equal(run('session.grade'), '2');
    assert.equal(run('session.qs.length'), 1);
    assert.match(get('#q-card').textContent, /本番形式/);
    assert.match(get('#q-card').textContent, /80〜100語/);
    const box = get('#wr-box');
    box.value = 'I think high school students should have part-time jobs. First, they can earn their own money and learn its value. Second, working with adults gives them valuable social experience. However, jobs should not take too much time from their studies. Schools should make rules about working hours to protect students. In addition, meeting various people at work will help them understand society better. I am looking forward to working and learning new things. I am excited about my future job experience.';
    box.dispatchEvent({ type: 'input' });
    get('#wr-submit').click();
    for (const input of get('#wr-checks').querySelectorAll('input')) {
      input.checked = true;
      input.dispatchEvent({ type: 'change' });
    }
    get('#wr-done').click();
    assert.equal(run('session.coinsEarned') > 0, true);
    assert.deepEqual(json('state.review'), []);
  });

  test('grade-2 flower reading uses one grouped passage and review ids resolve', () => {
    const app = loadApp();
    const { run, get } = app;
    run("activeGrade='2'; state=freshState('2'); state.coins=1000; BUILDINGS.forEach((b,i)=>confirmBuild(i,b.cat)); state.placed.flower.level=3; startSession('flower',false)");
    assert.equal(run('session.qs.length'), 5);
    assert.equal(run('new Set(session.qs.map(item=>item.q.group)).size'), 1, 'single group');
    assert.equal(run('session.qs.every(item=>item.id.startsWith("g2-flower-"))'), true);
    assert.equal(get('.reading-passage').textContent, run('session.qs[0].q.passage'));
    assert.equal(run(`validReview('g2-library-101','2')`), true);
    assert.equal(run(`validReview('g3-library-101','2')`), false);
  });

  test('summary workshop unlocks after essay in grades pre2 and 2', () => {
    for (const grade of ['pre2', '2']) {
      const app = loadApp();
      const { run, get } = app;
      run(`activeGrade='${grade}'; state=freshState('${grade}'); state.coins=2000`);
      assert.equal(run('state.unlocked.includes("summary")'), false);
      run("['library','school','cafe','station','park','flower'].forEach((c,i)=>confirmBuild(i,c)); openPalette()");
      assert.equal(get('[data-cat="summary"]').disabled, true);
      run("closeModal(); confirmBuild(6,'essay'); openPalette()");
      assert.equal(run('state.unlocked.includes("summary")'), true);
      assert.equal(get('[data-cat="summary"]').disabled, false);
      get('[data-cat="summary"]').click();
      assert.equal(run('pendingPlace'), 'summary');
      run("exitPlace(); closeModal(); activeGrade='4'; state=freshState('4'); openPalette()");
      assert.equal(get('[data-cat="summary"]'), null);
      run("exitPlace(); closeModal(); activeGrade='3'; state=freshState('3'); openPalette()");
      assert.equal(get('[data-cat="summary"]'), null);
      assert.equal(get('[data-cat="essay"]') === null, false);
      run("exitPlace(); closeModal(); activeGrade='5'; state=freshState('5'); openPalette()");
      assert.equal(get('[data-cat="summary"]'), null);
    }
  });

  test('essay workshop unlocks after flower in grade 2', () => {
    const app = loadApp();
    const { run, get } = app;
    run("activeGrade='2'; state=freshState('2'); state.coins=1000");
    assert.equal(run('state.unlocked.includes("essay")'), false);
    run("['library','school','cafe','station','park'].forEach((c,i)=>confirmBuild(i,c)); openPalette()");
    assert.equal(get('[data-cat="essay"]').disabled, true);
    run("closeModal(); confirmBuild(5,'flower'); openPalette()");
    assert.equal(run('state.unlocked.includes("essay")'), true);
    assert.equal(get('[data-cat="essay"]').disabled, false);
    get('[data-cat="essay"]').click();
    assert.equal(run('pendingPlace'), 'essay');
    run("exitPlace(); closeModal(); activeGrade='5'; state=freshState('5'); openPalette()");
    assert.equal(get('[data-cat="essay"]'), null);
  });

  test('grade-pre2 banks hold full practice sets with grouped reading passages', () => {
    const app = loadApp();
    assert.deepEqual(app.json(`['library','school','cafe','station','park'].map(c=>QUESTION_BANKS['pre2'][c].length)`), [18, 18, 18, 18, 18]);
    assert.equal(app.run(`QUESTION_BANKS['pre2'].flower.length`), 20);
    assert.deepEqual(app.json(`[...new Set(QUESTION_BANKS['pre2'].flower.map(q=>q.group))].sort()`), ['gpre2-reading-email-1', 'gpre2-reading-email-2', 'gpre2-reading-notice-1', 'gpre2-reading-notice-2', 'gpre2-reading-story-1', 'gpre2-reading-story-2']);
    assert.equal(app.run(`QUESTION_BANKS['pre2'].station.every(q=>q.positions.join()==='2,4')`), true);
    assert.equal(app.run(`['response','dialogue','passage'].every(part=>QUESTION_BANKS['pre2'].park.filter(q=>q.part===part).length===6)`), true);
    assert.equal(app.run(`QUESTION_BANKS['pre2'].essay.length`), 6);
    assert.equal(app.run(`QUESTION_BANKS['pre2'].summary.length`), 6);
    assert.equal(app.run(`QUESTION_BANKS['pre2'].summary.every(q=>{const n=wordCount(q.sample);return n>=25&&n<=35})`), true);
    assert.equal(app.run(`QUESTION_BANKS['pre2'].summary.length`), 6);
  });

  test('grade-pre2 essay submission records coins without review entries', () => {
    const app = loadApp();
    const { run, get, json } = app;
    run("activeGrade='pre2'; state=freshState('pre2'); state.coins=1000; BUILDINGS.forEach((b,i)=>confirmBuild(i,b.cat)); startSession('essay',false)");
    const box = get('#wr-box');
    box.value = 'I think school uniforms are necessary for students in Japan. First, all students look equal and nobody worries about fashion in class. Second, students can get ready quickly every morning without choosing clothes. However, schools should sometimes allow free dress days for everyone.';
    box.dispatchEvent({ type: 'input' });
    get('#wr-submit').click();
    for (const input of get('#wr-checks').querySelectorAll('input')) {
      input.checked = true;
      input.dispatchEvent({ type: 'change' });
    }
    get('#wr-done').click();
    assert.equal(run('session.coinsEarned') > 0, true);
    assert.deepEqual(json('state.review'), []);
  });

  test('grade-pre2 flower reading uses one grouped passage and pre2 review ids resolve', () => {
    const app = loadApp();
    const { run, get, json } = app;
    run("activeGrade='pre2'; state=freshState('pre2'); state.coins=1000; BUILDINGS.forEach((b,i)=>confirmBuild(i,b.cat)); state.placed.flower.level=2; startSession('flower',false)");
    assert.equal(run('session.qs.length'), 3);
    assert.equal(run('new Set(session.qs.map(item=>item.q.group)).size'), 1, 'single group');
    assert.equal(run('session.qs.every(item=>item.id.startsWith("gpre2-flower-"))'), true);
    assert.equal(get('.reading-passage').textContent, run('session.qs[0].q.passage'));
    assert.equal(run(`validReview('gpre2-station-101','pre2')`), true);
    assert.equal(run(`validReview('g4-station-101','pre2')`), false);
    assert.equal(run(`validReview('gpre2-station-101','4')`), false);
  });

  test('essay workshop unlocks after flower in grade pre2', () => {
    const app = loadApp();
    const { run, get } = app;
    run("activeGrade='pre2'; state=freshState('pre2'); state.coins=1000");
    run("['library','school','cafe','station','park'].forEach((c,i)=>confirmBuild(i,c)); openPalette()");
    assert.equal(get('[data-cat="essay"]').disabled, true);
    run("closeModal(); confirmBuild(5,'flower'); openPalette()");
    assert.equal(run('state.unlocked.includes("essay")'), true);
    assert.equal(get('[data-cat="essay"]').disabled, false);
  });

  test('grade labels show 準2級 and tutorial counts buildings per grade', () => {
    const app = loadApp();
    const { run, get } = app;
    run("activeGrade='pre2'; state=freshState('pre2'); refreshGradeUI()");
    assert.equal(get('#active-grade').textContent, '準2級');
    run('openTutorial()');
    assert.match(get('#modal').textContent, /8つの建物/);
    run("closeModal(); activeGrade='3'; state=freshState('3'); refreshGradeUI(); openTutorial()");
    assert.match(get('#modal').textContent, /7つの建物/);
    run("closeModal(); activeGrade='4'; state=freshState('4'); refreshGradeUI(); openTutorial()");
    assert.match(get('#modal').textContent, /6つの建物/);
    assert.equal(get('#active-grade').textContent, '4級');
    run("closeModal(); activeGrade='5'; state=freshState('5'); refreshGradeUI(); openTutorial()");
    assert.match(get('#modal').textContent, /6つの建物/);
    run("closeModal(); activeGrade='2'; state=freshState('2'); refreshGradeUI(); openTutorial()");
    assert.match(get('#modal').textContent, /8つの建物/);
    assert.equal(get('#active-grade').textContent, '2級');
  });

  test('title flower guide renders breaks instead of raw markup', () => {
    const app = loadApp();
    app.run("activeGrade='4'; refreshGradeUI()");
    assert.match(app.get('#title-flower').innerHTML, /<br/);
    assert.doesNotMatch(app.get('#title-flower').textContent, /<br/);
  });

  test('tutorial finish toast appears only after starting the town', () => {
    const { run, get } = loadApp();
    const count = () => get('#toast-root').children.length;
    run("show('scr-title'); openTutorial(); tutPage=5; renderTut()");
    const before = count();
    get('#tut-next').click();
    assert.equal(count(), before);
    run("show('scr-town'); openTutorial(); tutPage=5; renderTut()");
    get('#tut-next').click();
    assert.equal(count(), before + 1);
    assert.match(get('#toast-root').children.at(-1).textContent, /図書館/);
  });
  test('grade-pre2 essay uses real-exam format with 50-80 word target', () => {
    const app = loadApp();
    const { run, get } = app;
    assert.equal(run(`QUESTION_BANKS['pre2'].essay.filter(q=>q.kind==='writing').every(q=>q.points.length===3)`), true);
    assert.deepEqual(app.json('WRITING_RANGE.pre2'), [50, 80]);
    assert.match(run('writingChecks("pre2")[0]'), /50〜80語/);
    run("activeGrade='pre2'; state=freshState('pre2'); state.coins=1000; BUILDINGS.forEach((b,i)=>confirmBuild(i,b.cat)); QUESTION_BANKS['pre2'].essay=QUESTION_BANKS['pre2'].essay.filter(q=>q.kind==='writing'); startSession('essay',false)");
    assert.equal(run('session.grade'), 'pre2');
    assert.equal(run('session.qs.length'), 1);
    assert.match(get('#q-card').textContent, /本番形式/);
    assert.match(get('#q-card').textContent, /50〜80語/);
  });

  test('grade3 banks hold full practice sets with grouped reading passages', () => {
    const app = loadApp();
    assert.deepEqual(app.json(`['library','school','cafe','station','park'].map(c=>QUESTION_BANKS['3'][c].length)`), [18, 18, 18, 18, 18]);
    assert.equal(app.run(`QUESTION_BANKS['3'].flower.length`), 20);
    assert.equal(app.run(`QUESTION_BANKS['3'].essay.length`), 6);
    assert.deepEqual(app.json(`[...new Set(QUESTION_BANKS['3'].flower.map(q=>q.group))].sort()`), ['g3-reading-email-1', 'g3-reading-email-2', 'g3-reading-notice-1', 'g3-reading-notice-2', 'g3-reading-story-1', 'g3-reading-story-2']);
    assert.equal(app.run(`QUESTION_BANKS['3'].station.every(q=>q.positions.join()==='2,4')`), true);
    assert.equal(app.run(`['response','dialogue','passage'].every(part=>QUESTION_BANKS['3'].park.filter(q=>q.part===part).length===6)`), true);
  });

  test('grade3 essay sessions use real-exam format with POINTS and 25-50 word target', () => {
    const app = loadApp();
    const { run, get, json } = app;
    run("activeGrade='3'; state=freshState('3'); state.coins=1000; BUILDINGS.forEach((b,i)=>confirmBuild(i,b.cat)); startSession('essay',false)");
    assert.equal(run('session.grade'), '3');
    assert.equal(run('session.qs.length'), 1);
    assert.equal(run('questionKind(session.qs[0].q)'), 'writing');
    assert.equal(run('session.qs[0].q.points.length'), 3);
    assert.match(get('#q-card').textContent, /本番形式/);
    assert.match(get('#q-card').textContent, /POINTS/);
    assert.match(get('#q-card').textContent, /25〜50語/);
    assert.ok(get('#wr-box'));
    const box = get('#wr-box');
    box.value = 'I think summer is the best season for many reasons. First, I can swim in the sea. Second, I can enjoy festivals with my friends every weekend in August.';
    box.dispatchEvent({ type: 'input' });
    get('#wr-submit').click();
    for (const input of get('#wr-checks').querySelectorAll('input')) {
      input.checked = true;
      input.dispatchEvent({ type: 'change' });
    }
    get('#wr-done').click();
    assert.equal(run('session.coinsEarned') > 0, true);
    assert.deepEqual(json('state.review'), []);
  });

  test('essay workshop unlocks after flower in grade 3 and stays hidden in grades 4 and 5', () => {
    const app = loadApp();
    const { run, get, json } = app;
    run("activeGrade='3'; state=freshState('3'); state.coins=1000");
    assert.equal(run('state.unlocked.includes("essay")'), false);
    run('openPalette()');
    assert.equal(get('[data-cat="essay"]').disabled, true);
    run("closeModal(); ['library','school','cafe','station','park'].forEach((c,i)=>confirmBuild(i,c)); openPalette()");
    assert.equal(get('[data-cat="essay"]').disabled, true);
    run("closeModal(); confirmBuild(5,'flower'); openPalette()");
    assert.equal(run('state.unlocked.includes("essay")'), true);
    assert.equal(get('[data-cat="essay"]').disabled, false);
    get('[data-cat="essay"]').click();
    assert.equal(run('pendingPlace'), 'essay');
    run("exitPlace(); closeModal(); activeGrade='4'; state=freshState('4'); openPalette()");
    assert.equal(get('[data-cat="essay"]'), null);
    assert.deepEqual(json('state.unlocked'), ['library', 'review']);
    assert.equal(run(`'essay' in B && B.essay.req`), 'flower');
  });

  test('order-pair renders fixed numbered units, requested positions and correct pair feedback', () => {
    const app = loadApp();
    const { run, get, json } = app;
    run("state.coins=1000; BUILDINGS.forEach((b,i)=>confirmBuild(i,b.cat)); startSession('station',false)");
    const q = run('session.qs[0].q');
    assert.equal(run('questionKind(session.qs[0].q)'), 'order-pair');
    const units = get('.order-units').textContent;
    q.units.forEach((unit, k) => assert.match(units, new RegExp(`${k + 1}: ${unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)));
    assert.match(get('.order-frame').textContent, new RegExp('\\[ 1 \\].*' + q.positions.map(p => `\\[ ${p} \\]`).join('.*')));
    const buttons = get('#q-answer-zone').querySelectorAll('.choice');
    assert.equal(buttons.length, 4);
    assert.deepEqual([...buttons].map(b => b.textContent.trim().replace(/^[0-9A-D]\s*/, '').replace(/\s+/g, ' ')), app.json('session.qs[0].q.pairs.map(p=>p.join(" → "))'));
    const okButton = buttons[run('session.qs[0].q.a')];
    okButton.click();
    assert.equal(run('session.results[0]'), true);
    assert.match(get('.feedback .fb-exp').textContent, new RegExp(q.order.map(n => q.units[n - 1]).join(' ').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    const stale = okButton.onclick;
    okButton.click();
    stale();
    assert.equal(run('state.totalAnswered'), 1);
  });

  test('structured listening covers parts, numbered choices, transcript after answer and no spoken answer leak', async () => {
    const app = loadApp();
    const { run, get, json, spoken } = app;
    const drain = () => new Promise(resolve => setImmediate(resolve));
    run("state.coins=1000; BUILDINGS.forEach((b,i)=>confirmBuild(i,b.cat)); startSession('park',false)");
    assert.deepEqual(json('[...new Set(session.qs.map(item=>item.q.part))]'), ['response', 'dialogue', 'passage']);
    run("stopSpeech(); session=null; state.review=QUESTION_BANKS['5'].park.filter(q=>q.part==='picture').map(q=>q.id); state.grade='5'; startReview()");
    const q = run('session.qs[0].q');
    assert.equal(get('.listening-picture svg') !== null, true, 'picture rendered');
    assert.equal(get('.listening-picture').getAttribute('aria-label').includes(q.c[q.a]), false, 'no answer leak');
    assert.equal(get('#q-card').textContent.includes(q.c[q.a]), false, 'no spoken text upfront');
    const buttons = get('#q-answer-zone').querySelectorAll('.choice');
    assert.equal(buttons.length, 3);
    assert.deepEqual([...buttons].map(b => b.textContent.trim()), ['1', '2', '3']);
    app.flushTimers(350);
    await drain();
    assert.deepEqual(spoken.filter(text => q.c.includes(text)), [], 'choices spoken with numbers not raw text');
    assert.equal(spoken.filter(text => text.startsWith('1. ')).length >= 2, true, 'two passes numbered choices');
    const okButton = buttons[q.a];
    okButton.click();
    assert.equal(get('.listening-transcript .transcript-text').textContent.includes(q.c[q.a]), true, 'transcript after answer');
    const before = spoken.length;
    await drain();
    assert.equal(spoken.length, before, 'no speech after answer');
    get('#fb-next').click();
    await drain();
    assert.equal(spoken.length, before, 'no speech after advancing');
  });

  test('speech playback runs two passes with cancellation on answer, navigation and replay guards', async () => {
    const app = loadApp();
    const { run, get, spoken } = app;
    const drain = () => new Promise(resolve => setImmediate(resolve));
    run("state.coins=1000; BUILDINGS.forEach((b,i)=>confirmBuild(i,b.cat)); startSession('park',false)");
    app.flushTimers(350);
    await drain();
    const first = run('session.qs[0].q');
    assert.equal(spoken[0], first.segments[0].text, 'segments first');
    const numbered = spoken.filter(text => text.includes('1. ')).length;
    assert.equal(numbered >= 2, true, 'two passes');
    const count = spoken.length;
    get('[data-ok="true"]').click();
    assert.equal(spoken.length, count, 'stopSpeech cancels remaining playback');
    await drain();
    assert.equal(spoken.length, count, 'no speech resumes after answer');
    run('cancelCount=0');
    get('#fb-next').click();
    const next = run('session.qs[1].q');
    app.flushTimers(350);
    await drain();
    assert.equal(spoken.some(text => next.segments.some(segment => segment.text === text)), true, 'next question speaks');
    const beforeReplay = spoken.length;
    const play = get('#speak-btn').onclick;
    run('session.i=0');
    run("session.qs=['removed']");
    play();
    await drain();
    assert.equal(spoken.length, beforeReplay, 'stale replay ignored');
    run('goHome()');
    get('#yn-yes').click();
    app.flushTimers(350);
    await drain();
    assert.equal(spoken.length, beforeReplay, 'no speech after leaving session');
  });

  test('no-tts fallback shows explicit text instead of pretending audio', () => {
    const html = readFileSync(join(__dirname, 'eiken-town.html'), 'utf8');
    const app = loadApp({ html, beforeApp: 'window.speechSynthesis=undefined' });
    const { run, get } = app;
    run("state.coins=1000; BUILDINGS.forEach((b,i)=>confirmBuild(i,b.cat)); startSession('park',false)");
    const q = run('session.qs[0].q');
    assert.equal(get('#speak-btn').disabled, true);
    assert.match(get('#q-card').textContent, /音声を再生できません/);
    assert.equal(get('.tts-fallback').textContent.includes(q.segments[0].text), true, 'transcript shown');
  });

  test('grade-pre1 banks hold library, flower, cloze and listening sets', () => {
    const app = loadApp();
    assert.deepEqual(app.json(`Object.keys(QUESTION_BANKS['pre1'])`), ['library', 'school', 'cafe', 'flower', 'station', 'park', 'essay', 'summary']);
    assert.deepEqual(app.json(`QUESTION_BANKS['pre1'].library.map(q=>q.d)`), [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3]);
    assert.deepEqual(app.json(`QUESTION_BANKS['pre1'].school.map(q=>q.d)`), [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3]);
    assert.deepEqual(app.json(`QUESTION_BANKS['pre1'].cafe.map(q=>q.d)`), [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3]);
    assert.equal(app.run(`QUESTION_BANKS['pre1'].flower.length`), 20);
    assert.deepEqual(app.json(`[...new Set(QUESTION_BANKS['pre1'].flower.map(q=>q.group))].sort()`), ['gpre1-reading-email-1', 'gpre1-reading-email-2', 'gpre1-reading-notice-1', 'gpre1-reading-notice-2', 'gpre1-reading-story-1', 'gpre1-reading-story-2']);
    assert.equal(app.run(`QUESTION_BANKS['pre1'].station.length`), 18);
    assert.equal(app.run(`QUESTION_BANKS['pre1'].park.length`), 18);
    assert.equal(app.run(`QUESTION_BANKS['pre1'].essay.length`), 6);
    assert.equal(app.run(`QUESTION_BANKS['pre1'].summary.length`), 6);
    assert.equal(app.run(`QUESTION_BANKS['pre1'].essay.every(q=>{const n=wordCount(q.sample);return n>=120&&n<=150})`), true);
    assert.equal(app.run(`QUESTION_BANKS['pre1'].summary.every(q=>{const n=wordCount(q.sample);return n>=60&&n<=90})`), true);
    assert.equal(app.run(`QUESTION_BANKS['pre1'].park.length`), 18);
    assert.equal(app.run(`['response','dialogue','passage'].every(part=>QUESTION_BANKS['pre1'].park.filter(q=>q.part===part).length===6)`), true);
    assert.equal(app.run(`QUESTION_BANKS['pre1'].station.every(q=>q.kind==='reading')`), true);
    assert.deepEqual(app.json(`[...new Set(QUESTION_BANKS['pre1'].station.map(q=>q.group))].sort()`), ['gpre1-cloze-email-1', 'gpre1-cloze-email-2', 'gpre1-cloze-notice-1', 'gpre1-cloze-notice-2', 'gpre1-cloze-story-1', 'gpre1-cloze-story-2']);
  });

  test('grade-pre1 flower reading uses one grouped passage and review ids resolve', () => {
    const app = loadApp();
    const { run, get } = app;
    run("activeGrade='pre1'; state=freshState('pre1'); state.coins=1000; confirmBuild(0,'library'); state.placed.library.level=1; goHome()");
    run("state.unlocked.push('flower'); enterPlace('flower'); onTileTap(1)");
    get('#yn-yes').click();
    run("state.placed.flower.level=1; startSession('flower',false)");
    assert.equal(run('session.qs.length'), 2);
    assert.equal(run('new Set(session.qs.map(item=>item.q.group)).size'), 1, 'single group');
    assert.equal(run('session.qs.every(item=>item.id.startsWith("gpre1-flower-"))'), true);
    assert.equal(get('.reading-passage').textContent, run('session.qs[0].q.passage'));
    assert.equal(run(`validReview('gpre1-library-101','pre1')`), true);
    assert.equal(run(`validReview('g4-library-101','pre1')`), false);
  });

  test('grade-pre1 station cloze sessions show passages with blanks', () => {
    const app = loadApp();
    const { run, get } = app;
    run("activeGrade='pre1'; state=freshState('pre1'); state.coins=1000; confirmBuild(0,'library'); state.unlocked.push('station'); confirmBuild(1,'station'); startSession('station',false)");
    assert.equal(run('session.qs.length'), 5);
    assert.equal(run('session.qs.every(item=>item.id.startsWith("gpre1-station-"))'), true);
    assert.equal(get('.reading-passage').textContent, run('session.qs[0].q.passage'));
    assert.equal(run(`validReview('gpre1-station-101','pre1')`), true);
  });

  test('grade-pre1 palette stages buildings and unlocks along the chain', () => {
    const app = loadApp();
    const { run, get, json } = app;
    run("activeGrade='pre1'; state=freshState('pre1'); state.coins=2000; openPalette()");
    assert.equal(get('[data-cat="library"]').disabled, false);
    for (const locked of ['school', 'cafe', 'station', 'park', 'flower', 'essay', 'summary']) assert.equal(get(`[data-cat="${locked}"]`).disabled, true);
    const chain = [['school', 1], ['cafe', 2], ['station', 3], ['park', 4], ['flower', 5], ['essay', 6], ['summary', 7]];
    let built = ['library'];
    run("closeModal(); confirmBuild(0,'library')");
    for (const [cat, tile] of chain) {
      run('openPalette()');
      assert.equal(run(`state.unlocked.includes("${cat}")`), true);
      assert.equal(get(`[data-cat="${cat}"]`).disabled, false);
      run(`closeModal(); confirmBuild(${tile},'${cat}')`);
      built = [...built, cat];
    }
    run('renderMap()');
    assert.equal(get('#town-stats').textContent, '建物 8/8');
    assert.deepEqual(json('[...state.unlocked].sort()'), ['cafe', 'essay', 'flower', 'library', 'park', 'review', 'school', 'station', 'summary']);
  });

  test('review tower is free from the start, opens a review menu, and stays out of ranks and stats', () => {
    const { run, get, json } = loadApp();
    run("activeGrade='4'; state=freshState('4'); state.coins=2000; openPalette()");
    assert.equal(get('[data-cat="review"]').disabled, false);
    assert.match(get('[data-cat="review"]').textContent, /無料/);
    assert.equal(run('state.unlocked.includes("review")'), true);
    run("closeModal(); confirmBuild(0,'library'); confirmBuild(1,'review')");
    assert.equal(run('state.coins'), 2000);
    assert.deepEqual(json('state.placed.review'), { tile: 1, level: 1 });
    run("confirmBuild(2,'school'); confirmBuild(3,'cafe'); confirmBuild(4,'station'); confirmBuild(5,'park')");
    run('renderMap()');
    assert.equal(get('#town-stats').textContent, '建物 5/6');
    assert.equal(run('sumLevels()'), 5);
    assert.equal(run("canUpgrade('review')"), false);
    assert.equal(run("catTag('review')"), '🗼 ふくしゅう');
    run('onTileTap(1)');
    assert.match(get('#modal').textContent, /ふくしゅう待ち 0 問/);
    run("state.review=['g4-library-001']; onTileTap(1)");
    assert.match(get('#modal').textContent, /ふくしゅう待ち 1 問/);
    get('#rm-start').click();
    assert.equal(run('!!session&&session.isReview'), true);
    assert.equal(run('session.qs.length'), 1);
    run('goHome()');
    get('#yn-yes').click();
    run('onTileTap(1)');
    get('#rm-remove').click();
    get('#yn-yes').click();
    assert.equal(run('state.placed.review'), undefined);
    run('renderMap()');
    assert.equal(get('#town-stats').textContent, '建物 5/6');
  });

  test('grade labels show 準1級 and tutorial counts staged buildings', () => {
    const app = loadApp();
    const { run, get } = app;
    run("activeGrade='pre1'; state=freshState('pre1'); refreshGradeUI()");
    assert.equal(get('#active-grade').textContent, '準1級');
    run('openTutorial()');
    assert.match(get('#modal').textContent, /8つの建物/);
  });

  test('grade4 flower metadata is reading while grade5 remains optional writing', () => {
    const app = loadApp();
    assert.equal(app.run('catTag("flower","4")'), '読解（どっかい）');
    assert.equal(app.run('catTag("flower","3")'), '読解（どっかい）');
    assert.equal(app.run('catTag("flower","pre1")'), '読解（どっかい）');
    assert.match(app.run('catTag("flower","5")'), /さくぶん/);
    assert.equal(app.run('buildingDesc("flower","4")').includes('読解'), true);
    assert.equal(app.run('buildingDesc("flower","3")').includes('読解'), true);
    assert.equal(app.run('buildingDesc("flower","pre1")').includes('読解'), true);
    assert.equal(app.run('catTag("station","pre1")'), '📖 ちょうぶんほきゅう');
    assert.match(app.run('buildingDesc("station","pre1")'), /空所/);
    assert.match(app.run('writingChecks("pre1")[0]'), /120〜150語/);
    assert.match(app.run('writingChecks("pre1",true)[0]'), /自分の言葉/);
    assert.equal(app.run('buildingDesc("flower","5")').includes('本番の試験ではありません'), true);
    assert.equal(app.run('flowerGuide("4")').includes('読解'), true);
    assert.equal(app.run('flowerGuide("3")').includes('読解'), true);
    assert.equal(app.run('flowerGuide("pre1")').includes('読解'), true);
    assert.equal(app.run('flowerGuide("5")').includes('本番の試験ではありません'), true);
    assert.equal(app.run('questionKind(QUESTION_BANKS["4"].flower[0])'), 'reading');
    assert.equal(app.run('questionKind(QUESTION_BANKS["3"].flower[0])'), 'reading');
    assert.equal(app.run('questionKind(QUESTION_BANKS["pre1"].flower[0])'), 'reading');
    assert.equal(app.run('questionKind(QUESTION_BANKS["5"].flower[0])'), 'writing');
    app.run("state.coins=1000; BUILDINGS.forEach((b,i)=>confirmBuild(i,b.cat)); startSession('flower',false)");
    assert.equal(app.get('#title-flower').textContent.includes('読解'), true);
  });

  test('legacy object with envelope keys or unknown version is rejected, clean legacy loads', () => {
    for (const legacy of ['{"v":4,"towns":{},"coins":50}', '{"v":7,"coins":50}', '{"towns":{},"coins":50}']) {
      const storage = new Map([['eikenTownSave_v1', legacy]]);
      const app = loadApp({ storage });
      assert.equal(app.run('loadBlocked'), true, `rejected ${legacy.slice(0, 20)}`);
      assert.equal(app.get('#save-error').classList.contains('hidden'), false);
    }
    const storage = new Map([['eikenTownSave_v1', JSON.stringify({ v: 4, coins: 88, townName: 'よんの町' })]]);
    const app = loadApp({ storage });
    assert.equal(app.run('loadBlocked'), false);
    assert.equal(app.run('legacyLoaded'), true);
    assert.equal(app.run('state.townName'), 'よんの町');
    assert.equal(app.run('state.coins'), 88);
    assert.equal(app.run('activeGrade'), '4');
  });
}
