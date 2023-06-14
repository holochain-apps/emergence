<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import type { Record } from '@holochain/client';
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';
  import { type Info, type Session, SessionInterestBit, type Projection } from './types';

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
  $: projection = store.sessionInterestProjection($sessions)

  onMount(async () => {
  });


// const calcSessionData = (sessions: Array<Info<Session>>): Array<Projection> => {
//   projection = store.sessionInterestProjection(peopleCount, sessions)
//   totalAssesments = projection.totalAssesments
//   maxAttendance = projection.maxAttendance
//   minAttendance = projection.minAttendance

// }
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
  <h3>Attendees: {projection.peopleCount}; Assesments: {projection.totalAssesments}</h3>
  <table>
    <tr>    
      <th>Session</th><th>Estimated Attendance</th><th>Interest %</th><th>No Opinion</th><th>Going</th><th>Interested</th><th>Assesments</th>
    </tr>
    {#each projection.interestData as d}
      <tr>
          <td style={`color:black;background-color:${attendanceColor(d.estimatedAttendance)}`} align="right" width="200px">{d.session.record.entry.title}</td>
          <td align="center" width="100px">{d.estimatedAttendance.toFixed(0)}</td>
          <td align="center" >{(d.percentInterest*100).toFixed(1)}</td>
          <td align="center" >{d.passCount} </td>
          <td align="center" >{d.goingCount} </td>
          <td align="center" >{d.bookmarkedCount}</td>
          <td align="center" >{d.assesments}</td>
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