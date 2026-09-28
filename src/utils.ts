export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// A small safe arithmetic evaluator for the 'calc' command — deliberately
// not eval()/Function() so a visitor's input can never run arbitrary JS.
type Token = { type: "num"; value: number } | { type: "op"; value: string };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
    } else if (/[0-9.]/.test(ch)) {
      let j = i + 1;
      while (j < input.length && /[0-9.]/.test(input[j])) j++;
      const raw = input.slice(i, j);
      const value = Number(raw);
      if (Number.isNaN(value)) throw new Error(`bad number: ${raw}`);
      tokens.push({ type: "num", value });
      i = j;
    } else if ("+-*/^()".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
    } else {
      throw new Error(`unexpected character: ${ch}`);
    }
  }
  return tokens;
}

class Parser {
  private pos = 0;
  private tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private next(): Token {
    const t = this.tokens[this.pos];
    if (!t) throw new Error("unexpected end of expression");
    this.pos++;
    return t;
  }

  parse(): number {
    const value = this.parseExpr();
    if (this.pos < this.tokens.length) throw new Error(`unexpected token: ${this.tokens[this.pos].value}`);
    return value;
  }

  private parseExpr(): number {
    let value = this.parseTerm();
    while (this.peek()?.type === "op" && (this.peek()?.value === "+" || this.peek()?.value === "-")) {
      const op = this.next().value;
      const rhs = this.parseTerm();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }

  private parseTerm(): number {
    let value = this.parsePower();
    while (this.peek()?.type === "op" && (this.peek()?.value === "*" || this.peek()?.value === "/")) {
      const op = this.next().value;
      const rhs = this.parsePower();
      if (op === "/" && rhs === 0) throw new Error("division by zero");
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  }

  private parsePower(): number {
    const base = this.parseUnary();
    if (this.peek()?.type === "op" && this.peek()?.value === "^") {
      this.next();
      return Math.pow(base, this.parsePower());
    }
    return base;
  }

  private parseUnary(): number {
    if (this.peek()?.type === "op" && (this.peek()?.value === "-" || this.peek()?.value === "+")) {
      const op = this.next().value;
      return op === "-" ? -this.parseUnary() : this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const token = this.next();
    if (token.type === "num") return token.value;
    if (token.value === "(") {
      const value = this.parseExpr();
      const close = this.next();
      if (close.value !== ")") throw new Error("expected ')'");
      return value;
    }
    throw new Error(`unexpected token: ${token.value}`);
  }
}

export function evaluateExpression(input: string): number {
  const tokens = tokenize(input);
  if (tokens.length === 0) throw new Error("empty expression");
  return new Parser(tokens).parse();
}
