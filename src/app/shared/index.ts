// Main shared module exports

// Components
export * from './components';

// Pipes
export * from './pipes';

// Utils
export * from './utils';

// Re-export commonly used items - TEMPORAIREMENT DESACTIVE POUR COMPILATION
// export {
//   Button, type ButtonVariant, type ButtonSize
// } from './components/button/button';

// export {
//   Input, type InputType, type InputSize
// } from './components/input/input';

// export {
//   Select, type SelectOption, type SelectSize
// } from './components/select/select';

// export {
//   Checkbox, type CheckboxSize
// } from './components/checkbox/checkbox';

// export {
//   Radio, type RadioOption, type RadioSize
// } from './components/radio/radio';

// export {
//   Textarea, type TextAreaSize
// } from './components/textarea/textarea';

// export {
//   Card, type CardVariant, type CardPadding
// } from './components/card/card';

// export {
//   Modal, type ModalSize
// } from './components/modal/modal';

// Utils re-exports
export {
  DateUtils,
  StringUtils,
  ArrayUtils,
  ObjectUtils,
  StorageUtils,
  ValidationUtils,
  HTTP_STATUS_CODES,
  ERROR_MESSAGES,
  REGEX_PATTERNS
} from './utils';

// Pipes re-exports
export {
  TruncatePipe,
  CapitalizePipe,
  FileSizePipe,
  RelativeTimePipe,
  SafeHtmlPipe,
  SearchPipe,
  SortPipe,
  HighlightPipe,
  SHARED_PIPES
} from './pipes';