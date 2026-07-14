import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnouncementFormDialog } from './announcement-form-dialog';

describe('AnnouncementFormDialog', () => {
  let component: AnnouncementFormDialog;
  let fixture: ComponentFixture<AnnouncementFormDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnouncementFormDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(AnnouncementFormDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
