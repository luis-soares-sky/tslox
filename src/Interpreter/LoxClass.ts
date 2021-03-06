import { LoxCallable } from "./LoxCallable";
import { LoxFunction } from "./LoxFunction";
import { LoxInstance } from "./LoxInstance";
import { Interpreter } from "./Interpreter";

export class LoxClass extends LoxCallable {
    public constructor(
        public readonly name: string,
        public readonly superclass: LoxClass | undefined,
        private readonly methods: Map<string, LoxFunction>
    ) {
        super();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public call(interpreter: Interpreter, args: unknown[]): unknown {
        const instance = new LoxInstance(this);
        const initializer = this.findMethod("init");
        if (initializer != null) {
            initializer.bind(instance).call(interpreter, args);
        }
        return instance;
    }

    public findMethod(name: string): LoxFunction | undefined {
        if (this.methods.has(name)) {
            return this.methods.get(name);
        }

        if (this.superclass != null) {
            return this.superclass.findMethod(name);
        }

        return undefined;
    }

    public arity(): number {
        const initializer = this.findMethod("init");
        if (initializer != null) return initializer.arity();
        return 0;
    }

    public toString(): string {
        return this.name;
    }
}
