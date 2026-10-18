/**
 * Pipe global do app (T2.4; simplificado na T2.8, quando o `ValidationPipe` antigo saiu do projeto).
 *
 * - Caminho próprio: metatipo com regras no registro (`getValidationRules`/`getClassValidationRules`,
 *   chaves `ceviu:validation:*`) e valor nil/objeto simples → motor `validate`; nil vira `{}`
 *   (paridade com o `toEmptyIfNil` do ValidationPipe antigo); erros viram
 *   `BadRequestException(string[])` — mesmo corpo do legado
 *   (`{statusCode:400, message:string[], error:'Bad Request'}` montado pelo AllExceptionsFilter).
 * - Sem regras próprias, ou valores não-objeto (primitivos/arrays): devolve o valor como está.
 * - Lê: registro de validação (F2). Lido por: Nest (pipe global, `setup-app.ts`).
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { getClassValidationRules, getValidationRules } from './validation-registry';
import { validate } from './validate';

/** Construtor de classe usado como metatipo nos argumentos do Nest. */
type Metatype = NonNullable<ArgumentMetadata['metatype']>;

@Injectable()
export class FrameworkValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const metatype = metadata.metatype;
    if (this.hasOwnRules(metatype) && isPlainObjectOrNil(value)) {
      return this.validateWithEngine(value, metatype);
    }
    return value;
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

  private validateWithEngine(value: unknown, metatype: Metatype): unknown {
    const plain = (value === null || value === undefined ? {} : value) as Record<string, unknown>;
    const { value: entity, errors } = validate(metatype, plain);
    if (errors.length > 0) {
      throw new BadRequestException(errors.map((error) => error.message));
    }
    return entity;
  }
}

/** Só objeto simples ou nil entram no motor; primitivos e arrays passam como estão. */
function isPlainObjectOrNil(value: unknown): boolean {
  return (
    value === null || value === undefined || (typeof value === 'object' && !Array.isArray(value))
  );
}
