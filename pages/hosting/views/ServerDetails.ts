import { API, stupidErrorAlert } from "shared/mod.ts";
import { Box, Button, Custom, Entry, Form, Grid, StateHandler, TextInput, asState, isMobile, refMerge } from "webgen/mod.ts";
import { Server, SidecarResponse } from "../../../spec/music.ts";
import { isSidecarConnect, listFiles, messageQueueSidecar, sidecarDetailsSource } from "../loading.ts";
import { ServerStaticInfo } from "./ServerStaticInfo.ts";
import { auditEntry, hostingMenu } from "./menu.ts";
import { auditLogs, path } from "./state.ts";
import { TerminalComponent } from "./terminal.ts";
import { DisconnectedScreen } from "./waitingScreen.ts";

export function ServerDetails(server: StateHandler<Server>) {
    const terminal = new TerminalComponent();

    const input = asState({
        cpu: <number | undefined>undefined,
        memory: <number | undefined>undefined,
        disk: <number | undefined>undefined,
        message: ""
    });

    terminal.connected.listen(val => {
        if (val) {
            sidecarDetailsSource.setValue((data: SidecarResponse) => {
                if (data.type == "log") {
                    if (data.backlog)
                        terminal.reset();
                    terminal.write(data.chunk);
                }
                if (data.type == "stats") {
                    input.cpu = data.stats.cpu;
                    input.memory = data.stats.memory;
                    input.disk = data.stats.disk;
                }
            });
        }
    });

    return refMerge({
        connected: isSidecarConnect,
        mobile: isMobile
    })
        .map(({ connected, mobile }) => (() => {
            const items = Grid(
                ...ServerStaticInfo(mobile, server, input),
                connected
                    ? Entry(
                        Grid(
                            Box(Custom(terminal).addClass("terminal-window")).removeFromLayout(),
                            Form(Grid(
                                TextInput("text", "Send a Command")
                                    .sync(input, "message"),
                                Button("Send")
                                    .setId("submit-button")
                                    .onClick(() => {
                                        messageQueueSidecar.push({
                                            request: {
                                                type: "command",
                                                command: input.message
                                            },
                                            response: Promise.withResolvers<SidecarResponse>()
                                        });
                                        input.message = "";
                                    })
                            )
                                .setRawColumns("auto max-content")
                                .setGap(".5rem"))
                                .activeSubmitTo("#submit-button")
                        ).addClass("internal-grid")
                    ).addClass("terminal-card")
                    : DisconnectedScreen(),
                Grid(
                    Entry({
                        title: "Storage",
                        subtitle: "Manage your persistence",
                    }).onClick(async () => {
                        await listFiles("/");
                        path.setValue("/");
                        hostingMenu.path.setValue(`${hostingMenu.path.getValue()}storage/`);
                    }).addClass("small"),
                    Entry({
                        title: "Audit Trail",
                        subtitle: "Keep track of what's going on",
                    }).onClick(async () => {
                        const audit = await API.hosting.serverId(server._id).audit().then(stupidErrorAlert);
                        auditLogs.setValue(auditEntry(audit));
                        hostingMenu.path.setValue(`${hostingMenu.path.getValue()}audit-trail/`);
                    }).addClass("small"),
                    // Entry({
                    //     title: "Sub-User",
                    //     subtitle: "Add friends to manage your server",
                    // }).onClick(async () => {
                    //     const audit = await API.hosting.serverId(server._id).audit().then(stupidErrorAlert);
                    //     auditLogs.setValue(auditEntry(audit));
                    //     hostingMenu.path.setValue(`${hostingMenu.path.getValue()}audit-trail/`);
                    // }).addClass("small"),
                    Entry({
                        title: "Settings",
                        subtitle: "Update your Server"
                    }).onClick(() => {
                        hostingMenu.path.setValue(`${hostingMenu.path.getValue()}settings/`);
                    }).addClass("small")
                )
                    .addClass("split-list")
                    .setGap()
            )
                .setGap();

            if (!mobile)
                items.setRawColumns("69% auto");

            return items;
        })())
        .asRefComponent();
}
