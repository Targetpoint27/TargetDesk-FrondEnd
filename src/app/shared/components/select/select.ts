import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: any;
  label: string;
  disabled?: boolean;
}

export type SelectSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ui-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select.html',
  styleUrl: './select.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Select),
      multi: true
    }
  ]
})
export class Select implements ControlValueAccessor {
  @Input() size: SelectSize = 'md';
  @Input() placeholder = 'Sélectionner...';
  @Input() disabled = false;
  @Input() label = '';
  @Input() error = '';
  @Input() hint = '';
  @Input() required = false;
  @Input() options: SelectOption[] = [];
  @Input() clearable = false;

  @Output() valueChanged = new EventEmitter<any>();
  @Output() selectBlur = new EventEmitter<void>();
  @Output() selectFocus = new EventEmitter<void>();

  value: any = null;
  isOpen = false;
  focused = false;
  touched = false;

  private onChange = (value: any) => {};
  private onTouched = () => {};

  toggleDropdown() {
    if (!this.disabled) {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.onFocus();
      } else {
        this.onBlur();
      }
    }
  }

  selectOption(option: SelectOption) {
    if (!option.disabled) {
      this.value = option.value;
      this.isOpen = false;
      this.onChange(this.value);
      this.valueChanged.emit(this.value);
      this.onBlur();
    }
  }

  clearSelection() {
    this.value = null;
    this.onChange(this.value);
    this.valueChanged.emit(this.value);
  }

  onFocus() {
    this.focused = true;
    this.selectFocus.emit();
  }

  onBlur() {
    this.focused = false;
    this.touched = true;
    this.onTouched();
    this.selectBlur.emit();
  }

  getSelectedOption(): SelectOption | undefined {
    return this.options.find(option => option.value === this.value);
  }

  getSelectClasses(): string {
    const classes = ['select-field', `select-${this.size}`];

    if (this.error) classes.push('select-error');
    if (this.focused || this.isOpen) classes.push('select-focused');
    if (this.disabled) classes.push('select-disabled');

    return classes.join(' ');
  }

  getLabelClasses(): string {
    const classes = ['select-label'];

    if (this.required) classes.push('select-label-required');
    if (this.error) classes.push('select-label-error');

    return classes.join(' ');
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
