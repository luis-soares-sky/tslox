import * as Expr from "../Ast/Expr";
import * as Stmt from "../Ast/Stmt";
import { Token, TokenType } from "../Lexer/Token";
import { ParseError, reportTokenError } from "../Lox";

export class Parser {
    private tokens: Token[] = [];
    private current = 0;

    public constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    public parse(): Stmt.Stmt[] {
        const statements: Stmt.Stmt[] = [];
        while (!this.isAtEnd()) {
            if (this.match(TokenType.INLINE_COMMENT, TokenType.BLOCK_COMMENT)) {
                continue; // Ignore comments.
            }

            const decl = this.declaration();
            if (decl) statements.push(decl);
        }
        return statements;
    }

    private match(...types: TokenType[]): boolean {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    private advance(): Token {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    private consume(type: TokenType, message: string): Token {
        if (this.check(type)) return this.advance();

        throw this.error(this.peek(), message);
    }

    private check(type: TokenType): boolean {
        if (this.isAtEnd()) return false;
        return this.peek().type == type;
    }

    private isAtEnd(): boolean {
        return this.peek().type == TokenType.EOF;
    }

    private peek(): Token {
        return this.tokens[this.current];
    }

    private previous(): Token {
        return this.tokens[this.current - 1];
    }

    private error(token: Token, message: string) {
        reportTokenError(token, message);
        return new ParseError(token, message);
    }

    private synchronize() {
        this.advance();

        while (!this.isAtEnd()) {
            if (this.previous().type == TokenType.SEMICOLON) return;

            switch (this.peek().type) {
                case TokenType.CLASS:
                case TokenType.FUN:
                case TokenType.VAR:
                case TokenType.FOR:
                case TokenType.IF:
                case TokenType.WHILE:
                case TokenType.PRINT:
                case TokenType.RETURN:
                    return;
            }

            this.advance();
        }
    }

    // http://craftinginterpreters.com/statements-and-state.html#parsing-statements
    // http://craftinginterpreters.com/statements-and-state.html#scope

    private statement(): Stmt.Stmt {
        if (this.match(TokenType.FOR)) return this.forStatement();
        if (this.match(TokenType.IF)) return this.ifStatement();
        if (this.match(TokenType.PRINT)) return this.printStatement();
        if (this.match(TokenType.RETURN)) return this.returnStatement();
        if (this.match(TokenType.WHILE)) return this.whileStatement();
        if (this.match(TokenType.LEFT_BRACE)) return new Stmt.Block(this.blockStatement());
        return this.expressionStatement();
    }

    private forStatement(): Stmt.Stmt {
        this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'for'.");

        const initializer =
            this.match(TokenType.SEMICOLON)
                ? undefined
                : this.match(TokenType.VAR)
                    ? this.varDeclaration()
                    : this.expressionStatement();

        let condition = !this.check(TokenType.SEMICOLON)
            ? this.expression()
            : undefined;
        this.consume(TokenType.SEMICOLON, "Expect ';' after loop condition.");

        const increment = !this.check(TokenType.RIGHT_PAREN)
            ? this.expression()
            : undefined;
        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after loop clauses.");

        let body = this.statement();

        if (increment != null) {
            body = new Stmt.Block([
                body,
                new Stmt.Expression(increment)
            ]);
        }

        if (condition == null) condition = new Expr.Literal(true);
        body = new Stmt.While(condition, body);

        if (initializer != null) {
            body = new Stmt.Block([initializer, body]);
        }

        return body;
    }

    private ifStatement(): Stmt.Stmt {
        this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'.");
        const condition = this.expression();
        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after condition.");

        const thenBranch = this.statement();
        const elseBranch = this.match(TokenType.ELSE)
            ? this.statement()
            : undefined;

        return new Stmt.If(condition, thenBranch, elseBranch);
    }

    private printStatement(): Stmt.Stmt {
        const value = this.expression();
        this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
        return new Stmt.Print(value);
    }

    private returnStatement(): Stmt.Stmt {
        const keyword = this.previous();
        const value = !this.check(TokenType.SEMICOLON)
            ? this.expression()
            : undefined;

        this.consume(TokenType.SEMICOLON, "Expect ';' after return value.");
        return new Stmt.Return(keyword, value);
    }

    private whileStatement(): Stmt.Stmt {
        this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.");
        const condition = this.expression();
        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after condition.");

        const body = this.statement();

        return new Stmt.While(condition, body);
    }

    private expressionStatement(): Stmt.Stmt {
        const expr = this.expression();
        this.consume(TokenType.SEMICOLON, "Expect ';' after expression.");
        return new Stmt.Expression(expr);
    }

    private blockStatement(): Stmt.Stmt[] {
        const statements: Stmt.Stmt[] = [];

        while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
            const decl = this.declaration();
            if (decl) statements.push(decl);
        }

        this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.");
        return statements;
    }

    private declaration(): Stmt.Stmt | null {
        try {
            if (this.match(TokenType.CLASS)) return this.classDeclaration();
            if (this.match(TokenType.FUN)) return this.functionDeclaration("function");
            if (this.match(TokenType.VAR)) return this.varDeclaration();
            return this.statement();
        }
        catch (e) {
            if (e instanceof ParseError) {
                this.synchronize();
                return null;
            }
            throw e;
        }
    }

    private classDeclaration(): Stmt.Stmt {
        const name = this.consume(TokenType.IDENTIFIER, "Expect a class name.");

        let superclass = undefined;
        if (this.match(TokenType.LESS)) {
            this.consume(TokenType.IDENTIFIER, "Expect superclass name.");
            superclass = new Expr.Variable(this.previous());
        }

        this.consume(TokenType.LEFT_BRACE, "Expect '{' before class body.");

        const methods: Stmt.Fun[] = [];
        while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
            methods.push(this.functionDeclaration("method"));
        }

        this.consume(TokenType.RIGHT_BRACE, "Expect '}' after class body.");

        return new Stmt.Class(name, superclass, methods);
    }

    private functionDeclaration(kind: string): Stmt.Fun {
        const name: Token = this.consume(TokenType.IDENTIFIER, `Expect ${kind} name.`);
        this.consume(TokenType.LEFT_PAREN, `Expect '(' after ${kind} name.`);

        const params: Token[] = [];
        if (!this.check(TokenType.RIGHT_PAREN)) {
            do {
                if (params.length >= 255) {
                    this.error(this.peek(), "Can't have more than 255 parameters.");
                }

                params.push(this.consume(TokenType.IDENTIFIER, "Expect parameter name."));
            } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RIGHT_PAREN, `Expect ')' after parameters.`);

        this.consume(TokenType.LEFT_BRACE, `Expect '{' before ${kind} body.`);
        const body = this.blockStatement();

        return new Stmt.Fun(name, params, body);
    }

    private varDeclaration(): Stmt.Stmt {
        const name: Token = this.consume(TokenType.IDENTIFIER, "Expect variable name.");
        const initializer = this.match(TokenType.EQUAL)
            ? this.expression()
            : undefined;

        this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.");
        return new Stmt.Var(name, initializer);
    }

    // http://craftinginterpreters.com/parsing-expressions.html

    private expression(): Expr.Expr {
        return this.assignment();
    }

    private assignment(): Expr.Expr {
        const expr = this.or();

        if (this.match(TokenType.EQUAL)) {
            const equals = this.previous();
            const value = this.assignment();

            if (expr instanceof Expr.Variable) {
                return new Expr.Assign(expr.name, value);
            }
            else if (expr instanceof Expr.Get) {
                return new Expr.Set(expr.object, expr.name, value);
            }

            this.error(equals, "Invalid assignment target.");
        }

        return expr;
    }

    private or(): Expr.Expr {
        let expr = this.and();

        while (this.match(TokenType.OR)) {
            const operator = this.previous();
            const right = this.and();
            expr = new Expr.Logical(expr, operator, right);
        }

        return expr;
    }

    private and(): Expr.Expr {
        let expr = this.equality();

        while (this.match(TokenType.AND)) {
            const operator = this.previous();
            const right = this.equality();
            expr = new Expr.Logical(expr, operator, right);
        }

        return expr;
    }

    private equality(): Expr.Expr {
        let expr = this.comparison();

        while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
            const operator = this.previous();
            const right = this.comparison();
            expr = new Expr.Binary(expr, operator, right);
        }

        return expr;
    }

    private comparison(): Expr.Expr {
        let expr = this.term();

        while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
            const operator = this.previous();
            const right = this.term();
            expr = new Expr.Binary(expr, operator, right);
        }

        return expr;
    }

    private term(): Expr.Expr {
        let expr = this.factor();

        while (this.match(TokenType.MINUS, TokenType.PLUS)) {
            const operator = this.previous();
            const right = this.factor();
            expr = new Expr.Binary(expr, operator, right);
        }

        return expr;
    }

    private factor(): Expr.Expr {
        let expr = this.unary();

        while (this.match(TokenType.SLASH, TokenType.STAR)) {
            const operator = this.previous();
            const right = this.unary();
            expr = new Expr.Binary(expr, operator, right);
        }

        return expr;
    }

    private unary(): Expr.Expr {
        if (this.match(TokenType.BANG, TokenType.MINUS)) {
            const operator = this.previous();
            const right = this.unary();
            return new Expr.Unary(operator, right);
        }

        return this.call();
    }

    private call(): Expr.Expr {
        let expr = this.primary();

        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (this.match(TokenType.LEFT_PAREN)) {
                expr = this.finishCall(expr);
            }
            else if (this.match(TokenType.DOT)) {
                const name = this.consume(TokenType.IDENTIFIER, "Expect property name after '.'.");
                expr = new Expr.Get(expr, name);
            }
            else break;
        }

        return expr;
    }

    private finishCall(callee: Expr.Expr): Expr.Expr {
        const args: Expr.Expr[] = [];
        if (!this.check(TokenType.RIGHT_PAREN)) {
            do {
                if (args.length >= 255) {
                    this.error(this.peek(), "Can't have more than 255 arguments.");
                }
                args.push(this.expression());
            } while (this.match(TokenType.COMMA));
        }

        const paren = this.consume(TokenType.RIGHT_PAREN, "Expect ')' after arguments.");

        return new Expr.Call(callee, paren, args);
    }

    private primary(): Expr.Expr {
        if (this.match(TokenType.FALSE)) return new Expr.Literal(false);
        if (this.match(TokenType.TRUE)) return new Expr.Literal(true);
        if (this.match(TokenType.NIL)) return new Expr.Literal(null);

        if (this.match(TokenType.NUMBER, TokenType.STRING)) {
            return new Expr.Literal(this.previous().literal);
        }

        if (this.match(TokenType.SUPER)) {
            const keyword = this.previous();
            this.consume(TokenType.DOT, "Expect '.' after 'super'.");
            const method = this.consume(TokenType.IDENTIFIER, "Expect superclass method name.");
            return new Expr.Super(keyword, method);
        }

        if (this.match(TokenType.THIS)) return new Expr.This(this.previous());

        if (this.match(TokenType.IDENTIFIER)) {
            return new Expr.Variable(this.previous());
        }

        if (this.match(TokenType.LEFT_PAREN)) {
            const expr = this.expression();
            this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
            return new Expr.Grouping(expr);
        }

        throw this.error(this.peek(), "Expect expression.");
    }
}
