// WARNING: DO NOT EDIT THIS FILE MANUALLY!
// Please use the tool/generateAst.ts script using: `npm run ast "src/ast"`

import { Expr } from "./Expr";

export interface Visitor<T> {
    visitExpressionStmt(stmt: Expression): T;
    visitPrintStmt(stmt: Print): T;
}

export interface Stmt {
    accept<T>(visitor: Visitor<T>): T;
}

export class Expression implements Stmt {
    public constructor(
        public readonly expression: Expr,
    ) { }

    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitExpressionStmt(this);
    }
}

export class Print implements Stmt {
    public constructor(
        public readonly expression: Expr,
    ) { }

    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitPrintStmt(this);
    }
}