import { AppWebsocket, CellId } from "@holochain/client";
import { AgentApp, Scenario, pause } from "@holochain/tryorama";
import { Session } from "../ui/src/emergence/emergence/types";

const scenario = new Scenario();
const conductor = await scenario.addConductor();

const agentApps: Array<AgentApp & AppWebsocket> = [];
for (let i = 0; i < 100; i++) {
    try {
        const agentApp = await conductor.installApp({ path: "../workdir/emergence.happ" });
        const port = await conductor.attachAppInterface();
        const appWs = await AppWebsocket.connect(new URL(`ws://127.0.0.1:${port}`).href);
        console.log("app ws url", appWs.client.socket.url);
        agentApps.push(Object.assign(agentApp, appWs));
    } catch (error) {
        console.error("here's the error", error);
    }
}

console.time("authorizingSigningCredentials");
await Promise.all(
    agentApps.map(
        (agentApp) => conductor.adminWs().authorizeSigningCredentials(agentApp.cells[0].cell_id)
    )
);
console.timeEnd("authorizingSigningCredentials");

// const stopCreatingSessions = globalThis.setInterval(async () => {
for (let i = 0; i < agentApps.length; i++) {
    const agentApp = agentApps[i];
    const sessionEntry: Session = {
        key: i.toString(),
        session_type: i,
        title: i.toString(),
        description: "",
        leaders: [],
        smallest: 2,
        largest: 10,
        duration: 60,
        amenities: 1,
        trashed: false
    };
    const response = await agentApp.callZome({
        cell_id: agentApp.cells[0].cell_id,
        zome_name: "emergence",
        fn_name: "create_session",
        payload: sessionEntry,
        provenance: agentApp.agentPubKey,
    });
    console.log('session created by agent', i);
}

const stopAttachingAppInterface = globalThis.setInterval(async () => {
    const port = await conductor.attachAppInterface();
    const appWs = await AppWebsocket.connect(`ws://127.0.0.1:${port}`);
    console.log('connected new app ws at', appWs.client.socket.url);
}, 100);

await pause(1000 * 10);

globalThis.clearInterval(stopAttachingAppInterface);
await pause(1000);
await scenario.cleanUp();
