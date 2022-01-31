// WARNING: DO NOT EDIT THIS FILE MANUALLY!
// Please use the tool/generateAst.ts script using: `npm run ast "src/Ast"`

import { Token } from "../Lexer/Token";

export interface Visitor<T> {
    visitAssignExpr(expr: Assign): T;
    visitBinaryExpr(expr: Binary): T;
    visitGroupingExpr(expr: Grouping): T;
    visitLiteralExpr(expr: Literal): T;
    visitUnaryExpr(expr: Unary): T;
    visitVariableExpr(expr: Variable): T;
}

export interface Expr {
    accept<T>(visitor: Visitor<T>): T;
}

export class Assign implements Expr {
    public constructor(
        public readonly name: Token,
        public readonly value: Expr,
    ) { }

    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitAssignExpr(this);
    }
}

export class Binary implements Expr {
    public constructor(
        public readonly left: Expr,
        public readonly operator: Token,
        public readonly right: Expr,
    ) { }

    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitBinaryExpr(this);
    }
}

export class Grouping implements Expr {
    public constructor(
        public readonly expression: Expr,
    ) { }

    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitGroupingExpr(this);
    }
}

export class Literal implements Expr {
    public constructor(
        public readonly value: unknown,
    ) { }

    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitLiteralExpr(this);
    }
}

export class Unary implements Expr {
    public constructor(
        public readonly operator: Token,
        public readonly right: Expr,
    ) { }

    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitUnaryExpr(this);
    }
}

export class Variable implements Expr {
    public constructor(
        public readonly name: Token,
    ) { }

    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitVariableExpr(this);
    }
}
