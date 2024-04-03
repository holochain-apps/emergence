<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import type { Record } from '@holochain/client';
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  let error: any = undefined;
  $: error;
  $: sessions = store.sessions
  $: uiProps = store.uiProps
  $: totalAssesments = 0
  $: maxAttendance = 0
  $: minAttendance = 0
  $: projection = store.sessionInterestProjection($sessions)

  onMount(async () => {
    await store.updatePeopleCount()
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
<span>Error: {error}.</span>
{:else}
<div class="projections">
  <h3>Sessions: {projection.sessionCount}; Attendees: {projection.peopleCount}; Assesments: {projection.totalAssesments}</h3>
  <table>
    <tr>    
      <th>Session</th><th>Estimated Attendance</th><th>Interest %</th><th>No Opinion</th><th>Going</th><th>Interested</th><th>Assesments</th>
    </tr>
    {#each projection.interestData as d}
      <tr>
          <td style={`color:black;background-color:${attendanceColor(d.estimatedAttendance)}`} align="right" width="200px"><div class="title">{d.session.record.entry.title}</div></td>
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
  th {
    text-transform: uppercase;
    font-size: 10px;
  }

  .projections {
    display: flex;
    flex-direction: column;
    border: dashed 1px rgba(86, 94, 109, .3);
    box-shadow: 0px 0 15px inset rgba(0,0,0,.15);
    background-color: white;
    border-radius: 20px;
    padding: 10px;
    margin: 10px;
    max-height: 80vh;
    overflow: auto;
  }

  h3 {
    text-align: center;
    opacity: .5;
    font-size: 14px;
  }

  .title {
    max-width: 100px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }


@media (min-width: 500px) {
  .title {
    max-width: 130px;
  }
}


@media (min-width: 600px) {
  .title {
    max-width: 180px;
  }
}


@media (min-width: 720px) {
  .title {
    max-width: 210px;
  }

  .projections {
    max-height: 50vh;
  }
}

</style>