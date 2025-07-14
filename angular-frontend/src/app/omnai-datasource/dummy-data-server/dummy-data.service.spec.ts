import { TestBed } from '@angular/core/testing';

import { DummyDataService } from './dummy-data.service';

describe('DummyDataService', () => {
  let service: DummyDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DummyDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  }, 10);

  it('should generate appropriate amounts of data', async () => {
    await sleep(1000);
    const data = await service.getData();
    expect(data.length).toBe(1);
    expect(data[0].data.length).toBe(2);
    expect(data[0].data[0].values.length).toBeGreaterThan(900)
    expect(data[0].data[0].values.length).toBeLessThan(1100)
  }, 1500);

  it('should split sessions correctly', async () => {
    await sleep(100);
    const initialSessions = await service.getSessions();
    expect(initialSessions.length).toBe(2);
    await sleep(900);
    const pauseStart = performance.now();
    await service.pause();
    await sleep(500);
    const playStart = performance.now();
    await service.play();
    const pauseEnd = performance.now();
    const pauseLength = pauseEnd - pauseStart;
    await sleep(1000);
    const sessions = await service.getSessions();
    const playEnd = performance.now();
    const playLength = playEnd - playStart;
    expect(sessions.length).toBe(3);
    expect(sessions[2].startTime - sessions[1].endTime).toBeGreaterThan(pauseLength - 100);
    expect(sessions[2].startTime - sessions[1].endTime).toBeLessThan(pauseLength + 100);
    expect(sessions[1].endTime - sessions[1].startTime).toBeGreaterThan(playLength - 100);
    expect(sessions[1].endTime - sessions[1].startTime).toBeLessThan(playLength + 100);
    expect(sessions[2].endTime).toBePositiveInfinity();
  }, 5000)

  it('should correctly communicate its pause state', async () => {
    await sleep(50);
    expect(service.paused()).toBeFalse();
    await service.pause()
    expect(service.paused()).toBeTrue();
    await service.play()
    expect(service.paused()).toBeFalse();
  }, 100)

  it('should correctly communicate which channels are alive', async () => {
    await sleep(50);
    expect(service.aliveChannels().length).toBe(service.channels().length);
  }, 100)
});

function sleep(time: number): Promise<void> {
  return new Promise(res => setTimeout(res, time))
}
