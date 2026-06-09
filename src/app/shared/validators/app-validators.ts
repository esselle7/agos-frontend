import { ValidatorFn, Validators } from '@angular/forms';

export class AppValidators {
  /** Blocca < e > per prevenire injection HTML nei campi testo libero. */
  static safeText(): ValidatorFn {
    return Validators.pattern(/^[^<>]*$/);
  }

  /** Solo lettere (incluse accentate italiane), spazio, apostrofo, trattino. Per nome/cognome. */
  static onlyLetters(): ValidatorFn {
    return Validators.pattern(/^[a-zA-ZÀ-ÿ\s'''\-]*$/);
  }

  /** Formato numero di telefono: cifre, spazio, +, -, (, ). */
  static phone(): ValidatorFn {
    return Validators.pattern(/^[\d\s+\-().]*$/);
  }

  /** Solo cifre e lettere, nessun carattere speciale. Per codici come SDI. */
  static alphanumeric(): ValidatorFn {
    return Validators.pattern(/^[a-zA-Z0-9]*$/);
  }
}
