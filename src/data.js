export const TEAMS = ['Hearts', 'Celtic', 'Rangers', 'Motherwell', 'Hibernian', 'Falkirk']

export const TEAM_COLORS = {
  Hearts: '#800020',
  Celtic: '#1a6b3c',
  Rangers: '#003e7e',
  Motherwell: '#c1121f',
  Hibernian: '#00573f',
  Falkirk: '#003087',
}

export const BASE = {
  Hearts:     { played: 35, gd: 32,  pts: 76, gf: 62 },
  Celtic:     { played: 35, gd: 27,  pts: 73, gf: 64 },
  Rangers:    { played: 35, gd: 33,  pts: 69, gf: 69 },
  Motherwell: { played: 35, gd: 23,  pts: 57, gf: 55 },
  Hibernian:  { played: 35, gd: 12,  pts: 51, gf: 53 },
  Falkirk:    { played: 35, gd: -4,  pts: 49, gf: 47 },
}

export const ROUNDS = [
  {
    id: 36,
    label: 'Round 36',
    dateRange: '9–10 May',
    matches: [
      { id: 'r36m3', home: 'Falkirk',    away: 'Hibernian', kickoff: '9 May, 15:00',  result: { home: 1, away: 3 } },
      { id: 'r36m1', home: 'Motherwell', away: 'Hearts',    kickoff: '9 May, 20:00',  result: { home: 1, away: 1 } },
      { id: 'r36m2', home: 'Celtic',     away: 'Rangers',   kickoff: '10 May, 12:00', result: { home: 3, away: 1 } },
    ],
  },
  {
    id: 37,
    label: 'Round 37',
    dateRange: '13 May',
    matches: [
      { id: 'r37m1', home: 'Hearts',     away: 'Falkirk',   kickoff: '13 May, 20:00',  result: { home: 3, away: 0 } },
      { id: 'r37m2', home: 'Motherwell', away: 'Celtic',    kickoff: '13 May, 20:00',  result: { home: 2, away: 3 } },
      { id: 'r37m3', home: 'Rangers',    away: 'Hibernian', kickoff: '13 May, 20:00',  result: { home: 1, away: 2 } },
    ],
  },
  {
    id: 38,
    label: 'Round 38',
    dateRange: '16 May',
    matches: [
      { id: 'r38m1', home: 'Celtic',    away: 'Hearts',     kickoff: '16 May, 12:30' },
      { id: 'r38m2', home: 'Falkirk',  away: 'Rangers',    kickoff: '16 May, 12:30' },
      { id: 'r38m3', home: 'Hibernian', away: 'Motherwell', kickoff: '16 May, 12:30' },
    ],
  },
]

export const VIEW_OPTIONS = [
  { value: 38, label: 'All Rounds',  sub: 'After Round 38' },
  { value: 37, label: 'R38 off',     sub: 'After Round 37' },
  { value: 36, label: 'R37–38 off',  sub: 'After Round 36' },
  { value: 35, label: 'Current',     sub: 'After Round 35' },
]

const MATCH_IDS = ROUNDS.flatMap(r => r.matches.map(m => m.id))

export function encodeState(scores, viewAfter) {
  const arr = MATCH_IDS.flatMap(id => [scores[id].home, scores[id].away])
  return btoa(JSON.stringify({ v: viewAfter, s: arr }))
}

export function decodeState(param) {
  try {
    const { v, s } = JSON.parse(atob(param))
    if (!Array.isArray(s) || s.length !== MATCH_IDS.length * 2) return null
    const scores = {}
    MATCH_IDS.forEach((id, i) => {
      const h = parseInt(s[i * 2], 10)
      const a = parseInt(s[i * 2 + 1], 10)
      scores[id] = {
        home: Number.isFinite(h) && h >= 0 ? h : 0,
        away: Number.isFinite(a) && a >= 0 ? a : 0,
      }
    })
    const validViews = [35, 36, 37, 38]
    return { scores, viewAfter: validViews.includes(v) ? v : 38 }
  } catch {
    return null
  }
}

export function initScores() {
  const s = {}
  ROUNDS.forEach(r => r.matches.forEach(m => {
    s[m.id] = m.result ? { ...m.result } : { home: 0, away: 0 }
  }))
  return s
}

export function applyLockedScores(scores) {
  const result = { ...scores }
  ROUNDS.forEach(r => r.matches.forEach(m => {
    if (m.result) result[m.id] = { ...m.result }
  }))
  return result
}

export function computeTable(scores, viewAfter) {
  const table = {}
  TEAMS.forEach(t => {
    table[t] = { team: t, played: BASE[t].played, gd: BASE[t].gd, pts: BASE[t].pts, gf: BASE[t].gf }
  })

  ROUNDS.forEach(round => {
    if (round.id > viewAfter) return
    round.matches.forEach(match => {
      const { home: h, away: a } = scores[match.id]
      table[match.home].played++
      table[match.away].played++
      table[match.home].gd += h - a
      table[match.away].gd += a - h
      table[match.home].gf += h
      table[match.away].gf += a
      if (h > a)      { table[match.home].pts += 3 }
      else if (a > h) { table[match.away].pts += 3 }
      else            { table[match.home].pts += 1; table[match.away].pts += 1 }
    })
  })

  return Object.values(table).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    if (b.gd  !== a.gd)  return b.gd  - a.gd
    if (b.gf  !== a.gf)  return b.gf  - a.gf
    const bothCelticHearts = (a.team === 'Hearts' || a.team === 'Celtic') &&
                             (b.team === 'Hearts' || b.team === 'Celtic')
    if (bothCelticHearts) return a.team === 'Hearts' ? -1 : 1
    return a.team.localeCompare(b.team)
  })
}
