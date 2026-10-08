// src/domain/f1/schemas.js
// 领域模型轻量运行时校验器（避免引入庞大第三方包，确保边缘环境零冷启动开销）

export function validateMeeting(m) {
  if (!m || typeof m !== 'object') return { valid: false, error: 'Meeting must be an object' };
  if (!m.id || typeof m.id !== 'string') return { valid: false, error: 'Meeting.id is required string' };
  if (typeof m.round !== 'number' || isNaN(m.round)) return { valid: false, error: 'Meeting.round is required number' };
  if (!m.name || typeof m.name !== 'string') return { valid: false, error: 'Meeting.name is required string' };
  if (!Array.isArray(m.sessions)) return { valid: false, error: 'Meeting.sessions must be an array' };
  return { valid: true, data: m };
}

export function validateDriverStanding(d) {
  if (!d || typeof d !== 'object') return { valid: false, error: 'DriverStanding must be an object' };
  if (typeof d.rank !== 'number' || isNaN(d.rank)) return { valid: false, error: 'DriverStanding.rank must be number' };
  if (!d.code || typeof d.code !== 'string') return { valid: false, error: 'DriverStanding.code must be string' };
  if (typeof d.points !== 'number' || isNaN(d.points)) return { valid: false, error: 'DriverStanding.points must be number' };
  return { valid: true, data: d };
}

export function validateConstructorStanding(c) {
  if (!c || typeof c !== 'object') return { valid: false, error: 'ConstructorStanding must be an object' };
  if (typeof c.rank !== 'number' || isNaN(c.rank)) return { valid: false, error: 'ConstructorStanding.rank must be number' };
  if (!c.name || typeof c.name !== 'string') return { valid: false, error: 'ConstructorStanding.name must be string' };
  if (typeof c.points !== 'number' || isNaN(c.points)) return { valid: false, error: 'ConstructorStanding.points must be number' };
  return { valid: true, data: c };
}

export function validateRaceResult(r) {
  if (!r || typeof r !== 'object') return { valid: false, error: 'RaceResult must be an object' };
  if (typeof r.round !== 'number') return { valid: false, error: 'RaceResult.round must be number' };
  if (!r.winner || typeof r.winner !== 'object') return { valid: false, error: 'RaceResult.winner must be an object' };
  if (!Array.isArray(r.results) || r.results.length === 0) return { valid: false, error: 'RaceResult.results must not be empty' };
  return { valid: true, data: r };
}

export function validateOverview(o) {
  if (!o || typeof o !== 'object') return { valid: false, error: 'Overview must be an object' };
  if (!o.season || !o.nextMeeting) return { valid: false, error: 'Overview requires season and nextMeeting' };
  if (!Array.isArray(o.driverStandings)) return { valid: false, error: 'Overview requires driverStandings array' };
  return { valid: true, data: o };
}
