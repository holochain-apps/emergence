<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import type { Record } from '@holochain/client';
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';
  import { type Info, type Session, SessionInterestBit } from './types';

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  let error: any = undefined;
  $: error;
  $: allProfiles = store.profilesStore.allProfiles
  $: sessions = store.sessions
  $: uiProps = store.uiProps
  $: peopleCount = $allProfiles.status=== "complete" ? Array.from($allProfiles.value.keys()).length : 0
  $: totalAssesments = 0
  $: maxAttendance = 0
  $: minAttendance = 0
  $: sessionData = calcSessionData($sessions)

  onMount(async () => {
  });

interface Projections {
    session:Info<Session>, 
    estimatedAttendance:number,
    percentInterest:number,
    assements:number,
    passCount:number,
    goingCount:number,
    bookmarkedCount:number,
}
const LIKELY_TO_ATTEND_PERCENT = .8
const calcSessionData = (sessions: Array<Info<Session>>): Array<Projections> => {
    let assementCount = 0
    let projections = sessions.filter(s=> (!s.record.entry.trashed)).map(session=>{
        const relData = store.getSessionReleationData(session)
        const interests = Array.from(relData.interest)
        const assements = interests.length
        const passCount = interests.filter(([_,i])=> i == SessionInterestBit.NoOpinion).length
        const goingCount = interests.filter(([_,i])=> i == SessionInterestBit.Going).length
        const bookmarkedCount = interests.filter(([_,i])=> i == SessionInterestBit.Interested).length
        const percentInterest = assements > 0 ? (goingCount + bookmarkedCount / .2) / assements : 0
        const estimatedAttendance = 0
        assementCount += assements
        return {session, estimatedAttendance, percentInterest, assements,  passCount, goingCount, bookmarkedCount}
    })
    totalAssesments = assementCount
    let sumOfPercentages = 0
    for (const p of projections) {
        sumOfPercentages += p.percentInterest
    }
    const s = 1/sumOfPercentages
    const likely = peopleCount*LIKELY_TO_ATTEND_PERCENT
    projections = projections.map(p=>{
        p.estimatedAttendance =  s * likely * peopleCount * p.percentInterest
        return p
    }).sort((a,b)=>b.estimatedAttendance- a.estimatedAttendance)
    const est = projections.map(p=>p.estimatedAttendance)
    maxAttendance = Math.max(...est)
    minAttendance = Math.min(...est)
    return projections
}
const attendanceColor = (attendance: number) : string => {
  let rankColor = Math.round(( (attendance - minAttendance) / (maxAttendance - minAttendance) ) * 10)
  const gradient = [145,155,166,175,185,195,205,215,225,235,245,255].reverse()
  return `rgb(160,${gradient[rankColor]},160)`
}
</script>
{#if error}
<span>Error: {error.data.data}.</span>
{:else}
<div class="projections">
  <h3>Attendees: {peopleCount}; Assesments: {totalAssesments}</h3>
  <table>
    <tr>    
      <th>Session</th><th>Estimated Attendance</th><th>Interest %</th><th>No Opinion</th><th>Going</th><th>Interested</th>
    </tr>
    {#each sessionData as d}
      <tr>
          <td style={`color:black;background-color:${attendanceColor(d.estimatedAttendance)}`} align="right" width="200px">{attendanceColor(d.estimatedAttendance)}{d.session.record.entry.title}</td>
          <td align="center" width="100px">{d.estimatedAttendance.toFixed(0)}</td>
          <td align="center" >{d.percentInterest.toFixed(1)}</td>
          <td align="center" >{d.passCount} </td>
          <td align="center" >{d.goingCount} </td>
          <td align="center" >{d.bookmarkedCount}</td>
      </tr>
    {/each}
  </table>
</div>


{/if}

<style>
  .projections {
    display: flex;
    flex-direction: column;
    border: solid 1px gray;
    background-color: white;
    border-radius: 20px;
    padding: 10px;
    margin: 10px;
  }

</style>