<script lang="ts">
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { timeWindowStartToStr, timeWindowDurationToStr, type TimeWindow } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@material/mwc-snackbar';
import '@shoelace-style/shoelace/dist/components/button/button.js';

export let timeWindow: TimeWindow;

</script>


<div class="slot">
  { timeWindowStartToStr(timeWindow) } for { timeWindowDurationToStr(timeWindow) } {timeWindow.tags.length > 0 ? timeWindow.tags.join(", ") : "" }
</div>

<style>
  .slot{
    margin-left:5px;
  }
</style>
