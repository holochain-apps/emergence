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

  onMount(async () => {
  });

  const sortSessions =(a:Info<Session>,b:Info<Session>) : number => {
  const slota = store.getSessionSlot(a)
  const slotb = store.getSessionSlot(b)
  let vala = a.record.entry.largest
  let valb =  a.record.entry.largest
  return  vala - valb 
}

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
const sessionData = (sessions: Array<Info<Session>>): Array<Projections> => {
    let assementCount = 0
    const projections = sessions.filter(s=> (!s.record.entry.trashed)).map(session=>{
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
    return projections.map(p=>{
        p.estimatedAttendance =  s * likely * peopleCount * p.percentInterest
        return p
    })    
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
    {#each sessionData($sessions) as d}
      <tr>
          <td align="right" width="200px">{d.session.record.entry.title}</td>
          <td align="center" width="100px">{d.estimatedAttendance.toFixed(0)}</td>
          <td align="center" >{d.percentInterest}</td>
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