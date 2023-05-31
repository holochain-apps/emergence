<script lang="ts">
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { timeWindowStartToStr, timeWindowDurationToStr, type TimeWindow } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@material/mwc-snackbar';
import '@shoelace-style/shoelace/dist/components/button/button.js';

export let timeWindow: TimeWindow;

</script>


<div class="window-summary">
  { timeWindowStartToStr(timeWindow) } for { timeWindowDurationToStr(timeWindow) } {timeWindow.tags.length > 0 ? timeWindow.tags.join(", ") : "" }
</div>

<style>
  .window-summary {
    margin-left:5px;
    display: inline;
  }
</style>
