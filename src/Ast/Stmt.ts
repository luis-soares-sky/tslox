// WARNING: DO NOT EDIT THIS FILE MANUALLY!
// Please use the tool/generateAst.ts script using: `npm run ast "src/Ast"`

import { Token } from "../Lexer/Token";
import { Expr } from "./Expr";

export interface Visitor<T> {
    visitBlockStmt(stmt: Block): T;
    visitExpressionStmt(stmt: Expression): T;
    visitPrintStmt(stmt: Print): T;
    visitVarStmt(stmt: Var): T;
}

export interface Stmt {
    accept<T>(visitor: Visitor<T>): T;
}

export class Block implements Stmt {
    public constructor(
        public readonly statements: Stmt[],
    ) { }

    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitBlockStmt(this);
    }
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

export class Var implements Stmt {
    public constructor(
        public readonly name: Token,
        public readonly initializer?: Expr,
    ) { }

    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitVarStmt(this);
    }
}
