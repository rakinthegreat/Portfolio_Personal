// The scientific calculator next to the phone, a CASIO fx-991CW (ClassWiz): HTML seen through a hole in its 3D face (like the phone's
// screen), so the keys are real buttons. A small recursive-descent parser does the maths; no eval.
import { sfx } from '../sound';

export const CALC_PX = 320; // face is 320 × 640 CSS px (1:2)

type Key = [label: string, token: string, cls?: string];
const KEYS: Key[] = [
  ['sin', 'sin(', 'fn'], ['cos', 'cos(', 'fn'], ['tan', 'tan(', 'fn'], ['ln', 'ln(', 'fn'], ['log', 'log(', 'fn'],
  ['√', '√(', 'fn'], ['x²', '²', 'fn'], ['xʸ', '^', 'fn'], ['(', '(', 'fn'], [')', ')', 'fn'],
  ['π', 'π', 'fn'], ['e', 'e', 'fn'], ['n!', '!', 'fn'], ['Ans', 'Ans', 'fn'], ['DRG', 'mode', 'fn'],
  ['7', '7'], ['8', '8'], ['9', '9'], ['DEL', 'del', 'warn'], ['AC', 'ac', 'warn'],
  ['4', '4'], ['5', '5'], ['6', '6'], ['×', '×'], ['÷', '÷'],
  ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+'], ['−', '−'],
  ['0', '0'], ['.', '.'], ['×10ˣ', 'exp'], ['%', '%'], ['EXE', '=', 'eq'],
];

class CalcError extends Error {}

const FUNCS: Record<string, (x: number, deg: boolean) => number> = {
  'sin(': (x, d) => Math.sin(d ? (x * Math.PI) / 180 : x),
  'cos(': (x, d) => Math.cos(d ? (x * Math.PI) / 180 : x),
  'tan(': (x, d) => {
    if (d && Math.abs(((x % 180) + 180) % 180 - 90) < 1e-9) throw new CalcError('math');
    return Math.tan(d ? (x * Math.PI) / 180 : x);
  },
  'ln(': (x) => Math.log(x),
  'log(': (x) => Math.log10(x),
  '√(': (x) => Math.sqrt(x),
};

/** Evaluate a token list: + − × ÷ ^, implicit multiplication, postfix ² ! %, functions, π e Ans. */
export function evaluate(tokens: string[], deg: boolean, ans: number): number {
  let i = 0;
  const peek = () => tokens[i];
  const startsValue = (t?: string) => t !== undefined && (/^[0-9.]$/.test(t) || t === '(' || t === 'π' || t === 'e' || t === 'Ans' || t in FUNCS);
  const close = () => {
    if (peek() === ')') i++;
    else if (i < tokens.length) throw new CalcError('syntax'); // a missing ) at the very end is forgiven
  };
  const primary = (): number => {
    const t = peek();
    if (t === undefined) throw new CalcError('syntax');
    if (/^[0-9.]$/.test(t)) {
      let s = '';
      while (/^[0-9.]$/.test(peek() ?? '')) s += tokens[i++];
      if ((s.match(/\./g) ?? []).length > 1 || s === '.') throw new CalcError('syntax');
      return parseFloat(s);
    }
    i++;
    if (t === 'π') return Math.PI;
    if (t === 'e') return Math.E;
    if (t === 'Ans') return ans;
    if (t === '(') {
      const v = expr();
      close();
      return v;
    }
    if (t in FUNCS) {
      const v = expr();
      close();
      return FUNCS[t](v, deg);
    }
    throw new CalcError('syntax');
  };
  const postfix = (): number => {
    let v = primary();
    for (;;) {
      const t = peek();
      if (t === '²') v = v * v;
      else if (t === '%') v = v / 100;
      else if (t === '!') {
        if (v < 0 || v > 170 || !Number.isInteger(v)) throw new CalcError('math');
        let f = 1;
        for (let k = 2; k <= v; k++) f *= k;
        v = f;
      } else return v;
      i++;
    }
  };
  const power = (): number => {
    const b = postfix();
    if (peek() === '^') {
      i++;
      return Math.pow(b, unary()); // right-associative: 2^3^2 = 2^9
    }
    return b;
  };
  const unary = (): number => {
    if (peek() === '−') {
      i++;
      return -unary();
    }
    if (peek() === '+') {
      i++;
      return unary();
    }
    return power();
  };
  const term = (): number => {
    let v = unary();
    for (;;) {
      const t = peek();
      if (t === '×' || t === '÷') {
        i++;
        const r = unary();
        v = t === '×' ? v * r : v / r;
      } else if (startsValue(t)) v *= power(); // 2π, 3(4), 2sin(30)
      else return v;
    }
  };
  function expr(): number {
    let v = term();
    while (peek() === '+' || peek() === '−') {
      const op = tokens[i++];
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  const v = expr();
  if (i < tokens.length) throw new CalcError('syntax');
  if (!Number.isFinite(v)) throw new CalcError('math');
  return Math.abs(v) < 1e-13 ? 0 : v;
}

const fmt = (v: number) => {
  if (v !== 0 && (Math.abs(v) >= 1e10 || Math.abs(v) < 1e-9)) {
    const [m, e] = v.toExponential(7).split('e');
    return `${parseFloat(m)}×10^${Number(e)}`;
  }
  return String(parseFloat(v.toPrecision(10)));
};

export function buildCalculator() {
  const el = document.createElement('div');
  el.className = 'calc';
  el.style.width = `${CALC_PX}px`;
  el.style.height = `${CALC_PX * 2}px`;
  el.innerHTML = `
    <div class="calc-top"><span class="calc-brand">CASIO</span><span class="calc-model"><b>fx-991CW</b><i>ClassWiz</i></span></div>
    <div class="calc-lcd" aria-live="polite">
      <div class="calc-ind"><span data-mode>DEG</span></div>
      <div class="calc-expr" data-expr></div>
      <div class="calc-out" data-out>0</div>
    </div>
    <div class="calc-keys">${KEYS.map(([l, t, c]) => `<button type="button" class="ck ${c ?? ''}" data-k="${t}">${l}</button>`).join('')}</div>`;
  const exprEl = el.querySelector<HTMLElement>('[data-expr]')!;
  const outEl = el.querySelector<HTMLElement>('[data-out]')!;
  const modeEl = el.querySelector<HTMLElement>('[data-mode]')!;
  let tokens: string[] = [];
  let ans = 0;
  let deg = true;
  let done = false; // just pressed =: a digit starts afresh, an operator carries on from Ans

  const show = () => {
    const s = tokens.join('');
    exprEl.textContent = s.length > 24 ? `…${s.slice(-23)}` : s;
  };
  const press = (t: string) => {
    if (t === 'ac') {
      tokens = [];
      done = false;
      outEl.textContent = '0';
    } else if (t === 'del') {
      if (done) done = false;
      tokens.pop();
    } else if (t === 'mode') {
      deg = !deg;
      modeEl.textContent = deg ? 'DEG' : 'RAD';
    } else if (t === '=') {
      if (!tokens.length) return show();
      try {
        ans = evaluate(tokens, deg, ans);
        outEl.textContent = fmt(ans);
      } catch (e) {
        outEl.textContent = e instanceof CalcError && e.message === 'math' ? 'Math ERROR' : 'Syntax ERROR';
      }
      done = true;
    } else {
      const add = t === 'exp' ? ['×', '1', '0', '^'] : [t];
      if (done) {
        const op = ['+', '−', '×', '÷', '^', '²', '!', '%'].includes(add[0]);
        tokens = op ? ['Ans'] : [];
        done = false;
      }
      tokens.push(...add);
    }
    show();
  };
  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-k]');
    if (!b) return;
    sfx.click();
    press(b.dataset.k!);
  });
  // typing works too while the calculator is in use
  const KB: Record<string, string> = { '*': '×', x: '×', '/': '÷', '-': '−', '+': '+', '^': '^', '(': '(', ')': ')', '%': '%', '!': '!', '.': '.', ',': '.', Enter: '=', '=': '=', Backspace: 'del', Delete: 'ac', p: 'π' };
  const key = (k: string) => {
    const t = /^[0-9]$/.test(k) ? k : KB[k];
    if (!t) return false;
    const btn = el.querySelector<HTMLElement>(`[data-k="${CSS.escape(t)}"]`);
    btn?.classList.add('down');
    setTimeout(() => btn?.classList.remove('down'), 110);
    sfx.click();
    press(t);
    return true;
  };
  return { el, key };
}
