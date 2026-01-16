import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
export type InputSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ui-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './input.html',
  styleUrl: './input.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UIInput),
      multi: true
    }
  ]
})
export class UIInput implements ControlValueAccessor {
  @Input() type: InputType = 'text';
  @Input() size: InputSize = 'md';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() label = '';
  @Input() error = '';
  @Input() hint = '';
  @Input() required = false;

  @Output() valueChanged = new EventEmitter<string>();
  @Output() inputBlur = new EventEmitter<void>();
  @Output() inputFocus = new EventEmitter<void>();

  value = '';
  focused = false;
  touched = false;

  private onChange = (value: string) => {};
  private onTouched = () => {};

  onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
    this.valueChanged.emit(this.value);
  }

  onFocus() {
    this.focused = true;
    this.inputFocus.emit();
  }

  onBlur() {
    this.focused = false;
    this.touched = true;
    this.onTouched();
    this.inputBlur.emit();
  }

  getInputClasses(): string {
    const classes = ['input-field', `input-${this.size}`];

    if (this.error) classes.push('input-error');
    if (this.focused) classes.push('input-focused');
    if (this.disabled) classes.push('input-disabled');

    return classes.join(' ');
  }

  getLabelClasses(): string {
    const classes = ['input-label'];

    if (this.required) classes.push('input-label-required');
    if (this.error) classes.push('input-label-error');

    return classes.join(' ');
  }

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}

// Export component
export { UIInput as UIInputComponent };