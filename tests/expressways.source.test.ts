import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const read = (path: string) =>
    readFileSync(new URL(path, import.meta.url), "utf8");

const schema = read("../src/maps/schema.ts");
const api = read("../src/maps/api/overpass.ts");
const measuring = read("../src/maps/questions/measuring.ts");
const draggableMarkers = read("../src/components/DraggableMarkers.tsx");

describe("expressway measuring question wiring", () => {
    it("exposes expressways as a measuring type backed by bundled GeoJSON", () => {
        expect(schema).toContain('z.literal("expressway")');
        expect(api).toContain('"/Expressways.geojson"');
        expect(api).toContain("nearestExpresswayToPoint");
        expect(api).toContain("nearestPointOnLine");
        expect(measuring).toContain('case "expressway"');
        expect(measuring).toContain("fetchExpressways");
        expect(draggableMarkers).toContain("nearestExpresswayToPoint");
        expect(draggableMarkers).toContain("nearest.properties.ref");
    });
});
