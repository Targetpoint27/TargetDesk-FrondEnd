import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type TextAreaSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ui-textarea',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './textarea.html',
  styleUrl: './textarea.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Textarea),
      multi: true
    }
  ]
})
export class Textarea implements ControlValueAccessor {
  @Input() size: TextAreaSize = 'md';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() label = '';
  @Input() error = '';
  @Input() hint = '';
  @Input() required = false;
  @Input() rows = 4;
  @Input() maxLength?: number;
  @Input() resize: 'none' | 'vertical' | 'horizontal' | 'both' = 'vertical';

  @Output() valueChanged = new EventEmitter<string>();
  @Output() textareaBlur = new EventEmitter<void>();
  @Output() textareaFocus = new EventEmitter<void>();

  value = '';
  focused = false;
  touched = false;

  private onChange = (value: string) => {};
  private onTouched = () => {};

  onInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.value = target.value;
    this.onChange(this.value);
    this.valueChanged.emit(this.value);
  }

  onFocus() {
    this.focused = true;
    this.textareaFocus.emit();
  }

  onBlur() {
    this.focused = false;
    this.touched = true;
    this.onTouched();
    this.textareaBlur.emit();
  }

  getTextareaClasses(): string {
    const classes = ['textarea-field', `textarea-${this.size}`, `textarea-resize-${this.resize}`];

    if (this.error) classes.push('textarea-error');
    if (this.focused) classes.push('textarea-focused');
    if (this.disabled) classes.push('textarea-disabled');

    return classes.join(' ');
  }

  getLabelClasses(): string {
    const classes = ['textarea-label'];

    if (this.required) classes.push('textarea-label-required');
    if (this.error) classes.push('textarea-label-error');

    return classes.join(' ');
  }

  getCurrentLength(): number {
    return this.value?.length || 0;
  }

  // ControlValueAccessor implementation
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
