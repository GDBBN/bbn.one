import { API, LoadingSpinner, Navigation, stupidErrorAlert } from "shared/mod.ts";
import { Body, Vertical, WebGen, asState, isMobile } from "webgen/mod.ts";
import '../../../assets/css/hosting.css';
import '../../../assets/css/main.css';
import { DynaNavigation } from "../../../components/nav.ts";
import { ServerTypes } from "../../../spec/music.ts";
import { RegisterAuthRefresh, renewAccessTokenIfNeeded } from "../../_legacy/helper.ts";
import { refreshState } from "../loading.ts";
import { creationState, state } from "./../data.ts";
import { creationView } from "./wizard.ts";

await RegisterAuthRefresh();
WebGen();

const clickHandler = async (serverType: string) => { creationState.type = serverType.replace("-", "") as ServerTypes; creationState.versions = asState(await API.hosting.versions(creationState.type).then(stupidErrorAlert)); };

const navigation = state.$loaded.map(loaded => loaded ? Navigation({
    title: "New Server",
    children: [
        {
            title: "Minecraft",
            id: "minecraft",
            subtitle: "Quickly start a Vanilla, Modded, or Bedrock Server",
            children: [
                {
                    title: "Recommended",
                    id: "default",
                    subtitle: "Play on Efficiency-First Servers with Plugins (Paper/Purpur)",
                    clickHandler,
                    children: [
                        creationView()
                    ]
                },
                {
                    title: "Vanilla",
                    id: "vanilla",
                    subtitle: "Playing on Snapshots? Play on the Vanilla Server",
                    clickHandler,
                    children: [
                        creationView()
                    ]
                },
                {
                    title: "Modded",
                    id: "modded",
                    subtitle: "Start a Fabric or Forge Server",
                    children: [
                        {
                            title: "Fabric",
                            id: "fabric",
                            subtitle: "Lightweight modding, customization, and optimized performance",
                            clickHandler,
                            children: [
                                creationView()
                            ]
                        },
                        {
                            title: "Forge",
                            id: "forge",
                            subtitle: "Extensive modding capabilities and customization options",
                            clickHandler,
                            children: [
                                creationView()
                            ]
                        }
                    ]
                },
                {
                    title: "Bedrock",
                    id: "bedrock",
                    subtitle: "Bedrock Edition (also known as the Bedrock Version or just Bedrock)",
                    clickHandler,
                    children: [
                        creationView()
                    ]
                },
                {
                    title: "PocketMineMP",
                    id: "pocketmine",
                    subtitle: "Bedrock server, providing customization and plugin support",
                    clickHandler,
                    children: [
                        creationView()
                    ]
                }
            ]
        },
        {
            title: "Cancel",
            subtitle: "Return back to Home",
            id: "exit",
            clickHandler: () => { location.href = location.href.replace("/create", ""); }
        }
    ]
}).addClass(
    isMobile.map(mobile => mobile ? "mobile-navigation" : "navigation"),
    "limited-width"
) : LoadingSpinner());


Body(Vertical(DynaNavigation("Hosting"), navigation.asRefComponent()));

renewAccessTokenIfNeeded()
    .then(() => refreshState())
    .then(() => state.loaded = true);
