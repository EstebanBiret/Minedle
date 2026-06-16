import fs from 'fs';
const src = fs.readFileSync(new URL('../modules/focus-trap.js', import.meta.url), 'utf8');
const code = src.replace(/^import[^\n]*\n/gm, '').replace(/^export\s+/gm, '')
  + '\nreturn { trapFocus, releaseFocus };';

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

// reconstruct the module with a fake `document` whose activeElement we control
function setup(names) {
  const d = { activeElement: null };
  const mk = (name) => ({ name, focusCalls: 0, focus() { this.focusCalls++; d.activeElement = this; } });
  const items = names.map(mk);
  const trigger = mk('trigger');
  d.activeElement = trigger; // something outside the modal is focused before opening
  let registered = null;
  const modal = {
    name: 'modal', focusCalls: 0, focus() { this.focusCalls++; d.activeElement = this; },
    querySelectorAll: () => items.slice(),
    contains: (el) => items.includes(el) || el === modal,
    addEventListener: (t, fn) => { if (t === 'keydown') registered = fn; },
    removeEventListener: (t, fn) => { if (t === 'keydown' && registered === fn) registered = null; },
  };
  const mod = new Function('document', code)(d);
  return {
    mod, modal, items, trigger, d,
    setActive: (el) => { d.activeElement = el; },
    fire: (key, shiftKey = false) => {
      const e = { key, shiftKey, prevented: false, preventDefault() { this.prevented = true; } };
      if (registered) registered(e);
      return e;
    },
    hasHandler: () => registered !== null,
  };
}

console.log('--- focus initial + piège armé ---');
let s = setup(['a', 'b', 'c']);
s.mod.trapFocus(s.modal);
test('focus déplacé sur le 1er élément', s.d.activeElement === s.items[0], true);
test('1er élément focus() appelé une fois', s.items[0].focusCalls, 1);
test('handler keydown enregistré', s.hasHandler(), true);

console.log('--- trapFocus idempotent ---');
s.mod.trapFocus(s.modal); // 2e appel : ne doit rien refaire
test('2e trapFocus : pas de re-focus', s.items[0].focusCalls, 1);

console.log('--- cycle Tab ---');
s = setup(['a', 'b', 'c']);
s.mod.trapFocus(s.modal);
s.setActive(s.items[2]); // sur le dernier
let e = s.fire('Tab');
test('Tab sur le dernier -> retour au premier', s.d.activeElement === s.items[0], true);
test('Tab au bord : preventDefault', e.prevented, true);

s.setActive(s.items[0]); // sur le premier
e = s.fire('Tab', true); // Shift+Tab
test('Shift+Tab sur le premier -> va au dernier', s.d.activeElement === s.items[2], true);
test('Shift+Tab au bord : preventDefault', e.prevented, true);

s.setActive(s.items[1]); // au milieu
e = s.fire('Tab');
test('Tab au milieu : navigation native (pas de preventDefault)', e.prevented, false);

e = s.fire('Enter'); // touche non-Tab
test('touche non-Tab ignorée', e.prevented, false);

console.log('--- releaseFocus ---');
s = setup(['a', 'b']);
const trigger = s.trigger;
s.mod.trapFocus(s.modal); // mémorise trigger, focus sur a
s.mod.releaseFocus(s.modal);
test('focus restauré sur le déclencheur', s.d.activeElement === trigger, true);
test('handler retiré', s.hasHandler(), false);
e = s.fire('Tab'); // plus de handler
test('après release : Tab ne fait plus rien', e.prevented, false);

console.log('--- modale sans élément focusable ---');
s = setup([]);
s.mod.trapFocus(s.modal);
test('aucun focusable : focus sur la modale', s.d.activeElement === s.modal, true);
e = s.fire('Tab');
test('aucun focusable : Tab bloqué', e.prevented, true);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
