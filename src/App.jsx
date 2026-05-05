import { useState, useEffect } from 'react'
import { ROUNDS, VIEW_OPTIONS, TEAM_COLORS, initScores, computeTable, encodeState, decodeState } from './data'
import './App.css'

function loadInitialState() {
  const p = new URLSearchParams(window.location.search).get('p')
  if (p) {
    const decoded = decodeState(p)
    if (decoded) return decoded
  }
  return { scores: initScores(), viewAfter: 38 }
}

function ShareButton({ scores, viewAfter }) {
  const [status, setStatus] = useState(null)

  const handleShare = async () => {
    const encoded = encodeState(scores, viewAfter)
    const url = `${window.location.origin}${window.location.pathname}?p=${encoded}`
    try {
      await navigator.clipboard.writeText(url)
      history.replaceState(null, '', `?p=${encoded}`)
      setStatus('copied')
    } catch {
      setStatus('error')
    }
    setTimeout(() => setStatus(null), 2500)
  }

  return (
    <button className={`share-btn${status ? ` share-btn--${status}` : ''}`} onClick={handleShare}>
      {status === 'copied' ? '✓ Link copied' : status === 'error' ? 'Copy failed' : 'Share'}
    </button>
  )
}

function TeamBadge({ team, small }) {
  const [imgError, setImgError] = useState(false)
  const slug = team.toLowerCase().replace(/\s+/g, '-')
  const src = `${import.meta.env.BASE_URL}badges/${slug}.svg`

  if (imgError) {
    return (
      <div className={small ? 'badge-fallback-sm' : 'badge-fallback'} style={{ background: TEAM_COLORS[team] }}>
        {team[0]}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={team}
      className={small ? 'badge-img-sm' : 'badge-img'}
      onError={() => setImgError(true)}
    />
  )
}

function LeagueTable({ rows }) {
  return (
    <div className="table-wrapper">
      <table className="league-table">
        <thead>
          <tr>
            <th className="th-pos"></th>
            <th className="th-badge"></th>
            <th className="th-team"></th>
            {/* <th>P</th> */}
            <th>GF</th>
            <th>GD</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.team} className={i < 3 ? 'row-top' : 'row-rest'}>
              <td className="td-pos">{i + 1}</td>
              <td className="td-badge"><TeamBadge team={row.team} /></td>
              <td className="td-team">{row.team}</td>
              {/* <td className="td-num">{row.played}</td> */}
              <td className="td-num">{row.gf}</td>
              <td className="td-num">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
              <td className="td-pts">{row.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const MAX_GOALS = 9

function ScoreStepper({ value, onChange, disabled }) {
  const [display, setDisplay] = useState(String(value))

  useEffect(() => { setDisplay(String(value)) }, [value])

  const handleChange = (e) => {
    const raw = e.target.value
    setDisplay(raw)
    const n = parseInt(raw, 10)
    if (!isNaN(n) && n >= 0 && n <= MAX_GOALS) onChange(n)
  }

  const handleBlur = () => {
    const n = parseInt(display, 10)
    const clamped = isNaN(n) || n < 0 ? 0 : Math.min(n, MAX_GOALS)
    setDisplay(String(clamped))
    onChange(clamped)
  }

  return (
    <div className="stepper">
      <button
        className="stepper-btn"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled || value === 0}
      >
        −
      </button>
      <input
        type="number"
        className="stepper-input"
        value={display}
        min={0}
        max={MAX_GOALS}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
      />
      <button
        className="stepper-btn"
        onClick={() => onChange(Math.min(MAX_GOALS, value + 1))}
        disabled={disabled || value === MAX_GOALS}
      >
        +
      </button>
    </div>
  )
}

function MatchRow({ match, score, onScore, disabled }) {
  const homeWins = score.home > score.away
  const awayWins = score.away > score.home

  return (
    <div className="match-row">
      <div className="team-cell home">
        <span className={`team-name ${homeWins ? 'winner' : ''}`}>{match.home}</span>
        <TeamBadge team={match.home} small />
      </div>
      <div className="score-block">
        <ScoreStepper
          value={score.home}
          onChange={v => onScore(match.id, 'home', v)}
          disabled={disabled}
        />
        <span className="score-sep">–</span>
        <ScoreStepper
          value={score.away}
          onChange={v => onScore(match.id, 'away', v)}
          disabled={disabled}
        />
      </div>
      <div className="team-cell away">
        <TeamBadge team={match.away} small />
        <span className={`team-name ${awayWins ? 'winner' : ''}`}>{match.away}</span>
      </div>
      <span className="kickoff">{match.kickoff}</span>
    </div>
  )
}

function RoundSection({ round, scores, onScore, active }) {
  return (
    <section className={`round-section${active ? '' : ' round-inactive'}`}>
      <div className="round-header">
        <div className="round-title-group">
          <h2 className="round-label">{round.label}</h2>
          <span className="round-date">{round.dateRange}</span>
        </div>
        {!active && <span className="not-counted-badge">Not counted</span>}
      </div>
      <div className="matches">
        {round.matches.map(match => (
          <MatchRow
            key={match.id}
            match={match}
            score={scores[match.id]}
            onScore={onScore}
            disabled={!active}
          />
        ))}
      </div>
    </section>
  )
}

export default function App() {
  const [{ scores: initS, viewAfter: initV }] = useState(loadInitialState)
  const [scores, setScores] = useState(initS)
  const [viewAfter, setViewAfter] = useState(initV)

  const handleScore = (matchId, side, value) => {
    setScores(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: value },
    }))
  }

  const table = computeTable(scores, viewAfter)

  const outcomeString = (() => {
    const [first, second] = table
    if (!second) return `${first.team} win the league`
    if (first.pts > second.pts) return `${first.team} win the league`
    if (first.gd  > second.gd)  return `${first.team} win the league on goal difference`
    if (first.gf  > second.gf)  return `${first.team} win the league on goals scored`
    const topTwo = new Set([first.team, second.team])
    if (topTwo.has('Hearts') && topTwo.has('Celtic')) return 'Hearts win the league on head-to-head points'
    return `${first.team} win the league`
  })()

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div>
            <h1>SPFL Top 6</h1>
            <p className="app-subtitle">Final 3 Rounds</p>
            <p className="app-subtitle">By <a href="https://twitter.com/hoskdoug">hoskdoug</a></p>
          </div>
          <ShareButton scores={scores} viewAfter={viewAfter} />
        </div>
      </header>

      {/* <div className="view-selector">
        {VIEW_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`view-btn${viewAfter === opt.value ? ' active' : ''}`}
            onClick={() => setViewAfter(opt.value)}
          >
            <span className="view-btn-label">{opt.label}</span>
            <span className="view-btn-sub">{opt.sub}</span>
          </button>
        ))}
      </div> */}

      <div className="outcome-banner">{outcomeString}</div>

      <LeagueTable rows={table} />

      <div className="rounds">
        {ROUNDS.map(round => (
          <RoundSection
            key={round.id}
            round={round}
            scores={scores}
            onScore={handleScore}
            active={round.id <= viewAfter}
          />
        ))}
      </div>
    </div>
  )
}
