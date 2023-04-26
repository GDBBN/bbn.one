import { Box, ButtonComponent, Component, Reactive, State, Vertical } from "webgen/mod.ts";
import { ActionBar, Link } from "../manager/misc/actionbar.ts";
import { Entry } from "../manager/misc/Entry.ts";

export interface MenuItem {
    title: string;
    id: `${string}/`;
    subtitle?: string;

    items?: MenuItem[];
    action?: (clickPath: string, item: MenuItem) => Promise<void> | void;
    custom?: (clickPath: string) => Component;
    /**
     * @default true
     */
    visible?: () => boolean;
    button?: ButtonComponent;
}

interface RootMenuItem extends MenuItem {
    categories?: { [ group in `${string}/` ]: Omit<MenuItem, "id"> };
    menuBarAction?: Link,
}

const FilterLastItem = (_: MenuItem, index: number, list: MenuItem[]): boolean => index != list.length - 1;

/**
 * # Declarative Tree Navigation
 *
 * Menu will be put into WebGen.
 *
 * Blocker till release:
 *
 * - ActionBar should be put in WebGen first (requires rewrite)
 *
 * - Entry should be put in WebGen first (requires rewrite)
 *
 * - Add URL Router
 */
export const Menu = (rootMenu: RootMenuItem) => new class extends Component {
    nav = State({
        active: <string>rootMenu.id
    });
    constructor() {
        super();
        this.wrapper.append(Reactive(this.nav, "active", () => this.walkMenu()).draw());
    }

    setActivePath(clickPath: string) {
        this.nav.active = clickPath;
        return this;
    }

    getActivePath() {
        const list: (MenuItem | RootMenuItem)[] = [ rootMenu ];
        for (const iterator of this.nav.active.match(/(\w+\/)/g) ?? []) {
            const last = list.at(-1)!;
            if (isCategoryMenu(last) && last.id != iterator) {
                // deno-lint-ignore no-explicit-any
                const item = last.categories?.[ iterator as any ];
                if (!item) continue;
                list.push({ ...item, id: "+" + iterator } as MenuItem);
            }
            if (Array.isArray(last.items)) {
                const item = last.items.find(x => x.id == iterator);
                if (item) list.push(item);
            }
        }
        return list;
    }

    private isRootNav() {
        return this.nav.active == rootMenu.id;
    }

    private walkMenu() {
        const activeEntries = this.getActivePath();
        const active = activeEntries.at(-1)!;

        const list = this.isRootNav() ? undefined : activeEntries.filter(FilterLastItem).map((x, i) => (<Link>{
            title: x.title,
            onclick: () => {
                this.nav.active = activeEntries.filter((_, index) => index <= i).map(x => x.id).join("");
            }
        }));

        const parentIsCategoryMenu = activeEntries.at(-2) && isCategoryMenu(activeEntries.at(-2)!);

        if (isCategoryMenu(active) || parentIsCategoryMenu)
            return Vertical(
                Box(this.renderCategoryBar(parentIsCategoryMenu ? rootMenu : active)).setMargin("0 0 1.5rem"),
                this.renderList(active.items),
                active.custom?.(activeEntries.map(x => x.id).join("") + active.id) ?? null
            );

        return Vertical(
            ActionBar(active.title, undefined, rootMenu.menuBarAction, list),
            this.renderList(active.items),
            active.custom?.(activeEntries.map(x => x.id).join("") + active.id) ?? null
        );
    }

    private renderCategoryBar(rootMenu: RootMenuItem) {
        return ActionBar(rootMenu.title, Object.entries(rootMenu.categories!).map(([ key, value ]) => {
            return {
                title: value.title,
                selected: key == this.getActivePath().at(-1)!.id.replace("+", ""),
                onclick: () => this.nav.active = rootMenu.id + key
            };
        }), rootMenu.menuBarAction);
    }

    private renderList(active?: MenuItem[]): Component | null {
        if (!active) return null;

        return Vertical(
            active?.map(menu => Entry(
                menu.title,
                menu.subtitle,
                this.menuClickHandler(menu)
            )) ?? []
        )
            .setGap("var(--gap)");
    }

    private menuClickHandler(menu: MenuItem) {
        if (menu.items) return () => {
            this.nav.active = this.nav.active + menu.id;
        };
        if (menu.action || menu.custom) return async () => {
            const clickPath = this.getActivePath().map(x => x.id).join("") + menu.id;
            await menu.action?.(clickPath, menu);
            if (menu.custom)
                this.nav.active = this.nav.active + menu.id;

        };
        return undefined;
    }
};

function isCategoryMenu(type: RootMenuItem | MenuItem): type is RootMenuItem {
    return !!(<RootMenuItem>type).categories;
}