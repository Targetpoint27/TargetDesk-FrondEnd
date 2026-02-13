import { Injectable, Injector } from '@angular/core';
import { Overlay, OverlayRef, OverlayConfig } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';

import { ScheduleCallbackModalComponent } from '../../shared/components/callback-modals/schedule-callback-modal.component';
import { CallbackResultModalComponent } from '../../shared/components/callback-modals/callback-result-modal.component';
import { CreateComplaintModalComponent } from '../../shared/components/complaint-modals/create-complaint-modal.component';
import { LinkClientModalComponent } from '../../shared/components/link-client-modal/link-client-modal.component';

import { Call, ScheduleCallbackRequest, CallbackResultRequest } from '../../domain/models/call.model';

export const MODAL_OVERLAY_REF = 'MODAL_OVERLAY_REF';

@Injectable({ providedIn: 'root' })
export class ModalService {

  constructor(
    private overlay: Overlay,
    private injector: Injector
  ) {}

  // ── Core overlay creator ────────────────────────────────────────────────────

  private createOverlay(): OverlayRef {
    const config = new OverlayConfig({
      hasBackdrop: true,
      backdropClass: 'modal-cdk-backdrop',
      panelClass: 'modal-cdk-panel',
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      scrollStrategy: this.overlay.scrollStrategies.block()
    });
    return this.overlay.create(config);
  }

  private buildInjector(overlayRef: OverlayRef): Injector {
    return Injector.create({
      parent: this.injector,
      providers: [
        { provide: MODAL_OVERLAY_REF, useValue: overlayRef }
      ]
    });
  }

  // ── Schedule Callback ───────────────────────────────────────────────────────

  openScheduleCallback(
    call: Call,
    onSubmit: (data: ScheduleCallbackRequest) => void
  ): OverlayRef {
    const overlayRef = this.createOverlay();
    const injector   = this.buildInjector(overlayRef);
    const portal     = new ComponentPortal(ScheduleCallbackModalComponent, null, injector);
    const ref        = overlayRef.attach(portal);

    ref.instance.call = call;
    ref.instance.onClose.subscribe(() => overlayRef.dispose());
    ref.instance.onSubmit.subscribe((data: ScheduleCallbackRequest) => {
      onSubmit(data);
      overlayRef.dispose();
    });

    overlayRef.backdropClick().subscribe(() => overlayRef.dispose());
    return overlayRef;
  }

  // ── Callback Result ─────────────────────────────────────────────────────────

  openCallbackResult(
    call: Call,
    onSubmit: (data: CallbackResultRequest) => void
  ): OverlayRef {
    const overlayRef = this.createOverlay();
    const injector   = this.buildInjector(overlayRef);
    const portal     = new ComponentPortal(CallbackResultModalComponent, null, injector);
    const ref        = overlayRef.attach(portal);

    ref.instance.call = call;
    ref.instance.onClose.subscribe(() => overlayRef.dispose());
    ref.instance.onSubmit.subscribe((data: CallbackResultRequest) => {
      onSubmit(data);
      overlayRef.dispose();
    });

    overlayRef.backdropClick().subscribe(() => overlayRef.dispose());
    return overlayRef;
  }

  // ── Create Complaint ────────────────────────────────────────────────────────

  openCreateComplaint(
    callId: number,
    clientId: number | null | undefined,
    onSubmit: (data: any) => void
  ): OverlayRef {
    const overlayRef = this.createOverlay();
    const injector   = this.buildInjector(overlayRef);
    const portal     = new ComponentPortal(CreateComplaintModalComponent, null, injector);
    const ref        = overlayRef.attach(portal);

    ref.instance.callId   = callId;
    ref.instance.clientId = clientId;
    ref.instance.close.subscribe(() => overlayRef.dispose());
    ref.instance.submit.subscribe((data: any) => {
      onSubmit(data);
      overlayRef.dispose();
    });

    overlayRef.backdropClick().subscribe(() => overlayRef.dispose());
    return overlayRef;
  }

  // ── Link Client ─────────────────────────────────────────────────────────────

  openLinkClient(
    onConfirm: (clientId: number) => void
  ): OverlayRef {
    const overlayRef = this.createOverlay();
    const injector   = this.buildInjector(overlayRef);
    const portal     = new ComponentPortal(LinkClientModalComponent, null, injector);
    const ref        = overlayRef.attach(portal);

    ref.instance.close.subscribe(() => overlayRef.dispose());
    ref.instance.confirm.subscribe((clientId: number) => {
      onConfirm(clientId);
      overlayRef.dispose();
    });

    overlayRef.backdropClick().subscribe(() => overlayRef.dispose());
    return overlayRef;
  }
}