import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoteDetailsModal } from './note-details-modal';

describe('NoteDetailsModal', () => {
  let component: NoteDetailsModal;
  let fixture: ComponentFixture<NoteDetailsModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoteDetailsModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoteDetailsModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
