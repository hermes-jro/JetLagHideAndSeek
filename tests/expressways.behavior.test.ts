import * as turf from "@turf/turf";
import type { Feature, FeatureCollection } from "geojson";
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import { airports } from "@/maps/api/data";
import {
    fetchExpressways,
    nearestExpresswayToPoint,
} from "@/maps/api/overpass";

const nearestPointOnLineSpy = vi.hoisted(() => vi.fn());

vi.mock("@turf/turf", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@turf/turf")>();
    nearestPointOnLineSpy.mockImplementation(actual.nearestPointOnLine);
    return { ...actual, nearestPointOnLine: nearestPointOnLineSpy };
});

const expresswayFeatures: Feature[] = [
    turf.multiLineString(
        [
            [
                [103.79, 1.3],
                [103.81, 1.3],
            ],
        ],
        { ref: "NEAR" },
    ),
    ...Array.from({ length: 100 }, (_, index) => {
        const longitude = -170 + index;
        const latitude = -50 + (index % 20);
        return turf.lineString(
            [
                [longitude, latitude],
                [longitude + 0.1, latitude + 0.1],
            ],
            { ref: `FAR-${index}` },
        );
    }),
];
const expressways: FeatureCollection =
    turf.featureCollection(expresswayFeatures);

const json = vi.fn(async () => expressways);

beforeAll(() => {
    vi.stubGlobal("caches", {
        open: vi.fn(async () => ({
            match: vi.fn(async () => ({ json })),
        })),
    });
});

afterAll(() => {
    vi.unstubAllGlobals();
});

beforeEach(() => {
    json.mockClear();
    nearestPointOnLineSpy.mockClear();
});

describe("bundled geographic data", () => {
    it("keeps every airport coordinate in longitude-latitude order within Singapore", () => {
        for (const airport of airports.features) {
            const [longitude, latitude] = airport.geometry.coordinates;
            expect(longitude, airport.properties?.name).toBeGreaterThanOrEqual(
                103.5,
            );
            expect(longitude, airport.properties?.name).toBeLessThanOrEqual(
                104.1,
            );
            expect(latitude, airport.properties?.name).toBeGreaterThanOrEqual(
                1.15,
            );
            expect(latitude, airport.properties?.name).toBeLessThanOrEqual(1.5);
        }
    });

    it("parses and reuses the bundled expressway collection only once", async () => {
        const first = await fetchExpressways();
        const second = await fetchExpressways();

        expect(first).toBe(expressways);
        expect(second).toBe(first);
        expect(json).toHaveBeenCalledTimes(1);
    });

    it("uses a spatially narrowed candidate set for nearest-expressway lookup", async () => {
        const nearest = await nearestExpresswayToPoint(1.301, 103.8);

        expect(nearest?.properties?.ref).toBe("NEAR");
        expect(nearestPointOnLineSpy).toHaveBeenCalled();
        expect(nearestPointOnLineSpy.mock.calls.length).toBeLessThan(10);
    });
});
