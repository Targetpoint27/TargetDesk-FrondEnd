import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface RadioOption {
  value: any;
  label: string;
  disabled?: boolean;
}

export type RadioSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ui-radio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './radio.html',
  styleUrl: './radio.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Radio),
      multi: true
    }
  ]
})
export class Radio implements ControlValueAccessor {
  @Input() size: RadioSize = 'md';
  @Input() name = '';
  @Input() label = '';
  @Input() disabled = false;
  @Input() options: RadioOption[] = [];
  @Input() direction: 'horizontal' | 'vertical' = 'vertical';
  @Input() error = '';
  @Input() hint = '';

  @Output() valueChanged = new EventEmitter<any>();

  value: any = null;
  touched = false;

  private onChange = (value: any) => {};
  private onTouched = () => {};

  selectOption(option: RadioOption) {
    if (!option.disabled && !this.disabled) {
      this.value = option.value;
      this.touched = true;
      this.onChange(this.value);
      this.onTouched();
      this.valueChanged.emit(this.value);
    }
  }

  isSelected(option: RadioOption): boolean {
    return this.value === option.value;
  }

  getRadioClasses(option: RadioOption): string {
    const classes = ['radio-input', `radio-${this.size}`];

    if (this.isSelected(option)) classes.push('radio-selected');
    if (option.disabled || this.disabled) classes.push('radio-disabled');
    if (this.error) classes.push('radio-error');

    return classes.join(' ');
  }

  getLabelClasses(): string {
    const classes = ['radio-group-label'];

    if (this.error) classes.push('radio-group-label-error');

    return classes.join(' ');
  }

  getGroupClasses(): string {
    const classes = ['radio-group', `radio-group-${this.direction}`];
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
