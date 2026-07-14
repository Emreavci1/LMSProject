import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnouncementManage } from './announcement-manage';

describe('AnnouncementManage', () => {
  let component: AnnouncementManage;
  let fixture: ComponentFixture<AnnouncementManage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnouncementManage],
    }).compileComponents();

    fixture = TestBed.createComponent(AnnouncementManage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
