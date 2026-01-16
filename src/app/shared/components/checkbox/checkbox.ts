import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type CheckboxSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ui-checkbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Checkbox),
      multi: true
    }
  ]
})
export class Checkbox implements ControlValueAccessor {
  @Input() size: CheckboxSize = 'md';
  @Input() label = '';
  @Input() disabled = false;
  @Input() indeterminate = false;
  @Input() error = '';
  @Input() hint = '';

  @Output() valueChanged = new EventEmitter<boolean>();
  @Output() checkboxBlur = new EventEmitter<void>();
  @Output() checkboxFocus = new EventEmitter<void>();

  checked = false;
  focused = false;
  touched = false;

  private onChange = (value: boolean) => {};
  private onTouched = () => {};

  toggle() {
    if (!this.disabled) {
      this.checked = !this.checked;
      this.indeterminate = false;
      this.onChange(this.checked);
      this.valueChanged.emit(this.checked);
    }
  }

  onFocus() {
    this.focused = true;
    this.checkboxFocus.emit();
  }

  onBlur() {
    this.focused = false;
    this.touched = true;
    this.onTouched();
    this.checkboxBlur.emit();
  }

  getCheckboxClasses(): string {
    const classes = ['checkbox-input', `checkbox-${this.size}`];

    if (this.checked) classes.push('checkbox-checked');
    if (this.indeterminate) classes.push('checkbox-indeterminate');
    if (this.disabled) classes.push('checkbox-disabled');
    if (this.focused) classes.push('checkbox-focused');
    if (this.error) classes.push('checkbox-error');

    return classes.join(' ');
  }

  getLabelClasses(): string {
    const classes = ['checkbox-label'];

    if (this.disabled) classes.push('checkbox-label-disabled');
    if (this.error) classes.push('checkbox-label-error');

    return classes.join(' ');
  }

  // ControlValueAccessor implementation
  writeValue(value: boolean): void {
    this.checked = !!value;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
