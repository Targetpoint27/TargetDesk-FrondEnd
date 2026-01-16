import { Directive, ElementRef, Input, HostListener, OnInit, Renderer2 } from '@angular/core';

// Tooltip Directive
@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class TooltipDirective implements OnInit {
  @Input('appTooltip') tooltipText = '';
  @Input() tooltipPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';

  private tooltipElement?: HTMLElement;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit() {
    this.renderer.setAttribute(this.el.nativeElement, 'title', this.tooltipText);
  }

  @HostListener('mouseenter') onMouseEnter() {
    if (this.tooltipText) {
      this.showTooltip();
    }
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.hideTooltip();
  }

  private showTooltip() {
    this.tooltipElement = this.renderer.createElement('div');
    this.renderer.addClass(this.tooltipElement, 'tooltip');
    this.renderer.addClass(this.tooltipElement, `tooltip-${this.tooltipPosition}`);
    this.renderer.appendChild(this.tooltipElement, this.renderer.createText(this.tooltipText));
    this.renderer.appendChild(document.body, this.tooltipElement);
    this.positionTooltip();
  }

  private hideTooltip() {
    if (this.tooltipElement) {
      this.renderer.removeChild(document.body, this.tooltipElement);
      this.tooltipElement = undefined;
    }
  }

  private positionTooltip() {
    if (!this.tooltipElement) return;

    const hostRect = this.el.nativeElement.getBoundingClientRect();
    const tooltipRect = this.tooltipElement.getBoundingClientRect();

    let top = 0;
    let left = 0;

    switch (this.tooltipPosition) {
      case 'top':
        top = hostRect.top - tooltipRect.height - 8;
        left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = hostRect.bottom + 8;
        left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
        left = hostRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
        left = hostRect.right + 8;
        break;
    }

    this.renderer.setStyle(this.tooltipElement, 'position', 'fixed');
    this.renderer.setStyle(this.tooltipElement, 'top', `${top}px`);
    this.renderer.setStyle(this.tooltipElement, 'left', `${left}px`);
  }
}

// Click Outside Directive
@Directive({
  selector: '[appClickOutside]',
  standalone: true
})
export class ClickOutsideDirective {
  @Input() clickOutside = () => {};

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(targetElement: EventTarget | null): void {
    if (!targetElement || !(targetElement instanceof HTMLElement)) {
      return;
    }

    const clickedInside = this.elementRef.nativeElement.contains(targetElement);
    if (!clickedInside) {
      this.clickOutside();
    }
  }
}

// Auto Focus Directive
@Directive({
  selector: '[appAutoFocus]',
  standalone: true
})
export class AutoFocusDirective implements OnInit {
  @Input() appAutoFocus: boolean | string = true;

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    if (this.shouldFocus()) {
      setTimeout(() => {
        this.elementRef.nativeElement.focus();
      }, 0);
    }
  }

  private shouldFocus(): boolean {
    if (typeof this.appAutoFocus === 'boolean') {
      return this.appAutoFocus;
    }
    return this.appAutoFocus !== 'false';
  }
}

// Copy to Clipboard Directive
@Directive({
  selector: '[appCopyToClipboard]',
  standalone: true
})
export class CopyToClipboardDirective {
  @Input('appCopyToClipboard') textToCopy = '';

  @HostListener('click') onClick() {
    if (this.textToCopy) {
      navigator.clipboard.writeText(this.textToCopy).then(() => {
        // Success feedback could be added here
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    }
  }
}

// Scroll To Directive
@Directive({
  selector: '[appScrollTo]',
  standalone: true
})
export class ScrollToDirective {
  @Input('appScrollTo') targetSelector = '';

  @HostListener('click') onClick() {
    if (this.targetSelector) {
      const targetElement = document.querySelector(this.targetSelector);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }
}

// Required Directive (for forms)
@Directive({
  selector: '[appRequired]',
  standalone: true
})
export class RequiredDirective implements OnInit {
  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    this.renderer.setAttribute(this.el.nativeElement, 'required', 'true');
    this.renderer.addClass(this.el.nativeElement, 'required-field');
  }
}

// Pattern Directive
@Directive({
  selector: '[appPattern]',
  standalone: true
})
export class PatternDirective implements OnInit {
  @Input('appPattern') pattern = '';

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    if (this.pattern) {
      this.renderer.setAttribute(this.el.nativeElement, 'pattern', this.pattern);
    }
  }
}

// Export all directives
export const SHARED_DIRECTIVES = [
  TooltipDirective,
  ClickOutsideDirective,
  AutoFocusDirective,
  CopyToClipboardDirective,
  ScrollToDirective,
  RequiredDirective,
  PatternDirective
] as const;