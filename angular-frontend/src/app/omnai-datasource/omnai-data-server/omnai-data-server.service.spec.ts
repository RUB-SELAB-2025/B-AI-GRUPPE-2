import { TestBed } from "@angular/core/testing";

import { OmnaiDataService } from "./omnai-data-server.service";

describe("OmnaiDataServerService", () => {
  let service: OmnaiDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OmnaiDataService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
