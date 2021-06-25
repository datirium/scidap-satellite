import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DockerStatsComponent } from './docker-stats.component';

describe('DockerStatsComponent', () => {
  let component: DockerStatsComponent;
  let fixture: ComponentFixture<DockerStatsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DockerStatsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DockerStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
