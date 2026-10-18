/**
 * Pipe global composto (T2.4) — substitui o `ValidationPipe` no `setup-app.ts`.
 *
 * - Caminho próprio: quando o metatipo tem regras no registro (`getValidationRules` ou
 *   `getClassValidationRules` ≠ undefined), valida com o motor `validate` (que lê
 *   `ceviu:validation:rules`/`ceviu:validation:class-rules`) e devolve a instância da classe;
 *   erros viram `BadRequestException(errors.map(m => m.message))`, o mesmo corpo do legado
 *   (`{statusCode:400, message:string[], error:'Bad Request'}` montado pelo AllExceptionsFilter).
 * - Body nil vira `{}` no caminho próprio (paridade com o `toEmptyIfNil` do ValidationPipe);
 *   primitivos e arrays delegam ao legado (comportamento exótico preservado; simplificação na T2.8).
 * - Caminho de delegação: metatipo sem regras próprias (ou primitivo/array) → `ValidationPipe`
 *   legado com as mesmas opções do `setup-app.ts` original
 *   (`whitelist/forbidNonWhitelisted/transform`), preservando o contrato HTTP até a T2.5+.
 * - Lê: registro de validação (F2). Lido por: Nest (pipe global, `setup-app.ts`).
 */
import { BadRequestException, Injectable, ValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { getClassValidationRules, getValidationRules } from './validation-registry';
import { validate } from './validate';

/** Construtor de classe usado como metatipo nos argumentos do Nest. */
type Metatype = NonNullable<ArgumentMetadata['metatype']>;

/** Opções do pipe legado, idênticas às do `setup-app.ts` antes da T2.4. */
const LEGACY_OPTIONS = { whitelist: true, forbidNonWhitelisted: true, transform: true };

@Injectable()
export class ComposedValidationPipe implements PipeTransform {
  private readonly legacy = new ValidationPipe(LEGACY_OPTIONS);

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const metatype = metadata.metatype;
    if (this.hasOwnRules(metatype) && this.isPlainObjectOrNil(value)) {
      return this.validateWithEngine(value, metatype);
    }
    return this.legacy.transform(value, metadata);
  }

  /** O metatipo tem registro próprio? (classes migradas da T2.5+) */
  private hasOwnRules(metatype: ArgumentMetadata['metatype']): metatype is Metatype {
    if (typeof metatype !== 'function') {
      return false;
    }
    return (
      getValidationRules(metatype) !== undefined || getClassValidationRules(metatype) !== undefined
    );
  }

  /** Só objeto simples ou nil entram no motor; primitivos e arrays seguem para o legado. */
  private isPlainObjectOrNil(value: unknown): boolean {
    return value === null || value === undefined || (typeof value === 'object' && !Array.isArray(value));
  }

  private validateWithEngine(value: unknown, metatype: Metatype): unknown {
    const plain = (
      value === null || value === undefined ? {} : value
    ) as Record<string, unknown>;
    const { value: entity, errors } = validate(metatype, plain);
    if (errors.length > 0) {
      throw new BadRequestException(errors.map((error) => error.message));
    }
    return entity;
  }
}
