import React from "react";
import { act } from "react-dom/test-utils";

import { render, unmountComponentAtNode } from "react-dom";
import { fireEvent } from "@testing-library/react";

import { Provider } from "react-redux";
import { createStore } from "redux";
import { Reducer } from "../main/redux/Reducers";

import App from "../App";

import { version, formats, events, languages } from "./mock/tnoodle.api.mock";
import { scrambleProgram, competitions, me, wcifs } from "./mock/wca.api.mock";

import _ from "lodash";
import { defaultWcif } from "../main/constants/default.wcif";

const tnoodleApi = require("../main/api/tnoodle.api");
const wcaApi = require("../main/api/wca.api");

let container = null;

let wcif, mbld, password, translations;
beforeEach(() => {
    // setup a DOM element as a render target
    container = document.createElement("div");
    document.body.appendChild(container);

    // Turn on mocking behavior
    jest.spyOn(tnoodleApi, "fetchWcaEvents").mockImplementation(() =>
        Promise.resolve(events)
    );

    jest.spyOn(tnoodleApi, "fetchFormats").mockImplementation(() =>
        Promise.resolve(formats)
    );

    jest.spyOn(
        tnoodleApi,
        "fetchAvailableFmcTranslations"
    ).mockImplementation(() => Promise.resolve(languages));

    jest.spyOn(tnoodleApi, "fetchRunningVersion").mockImplementation(() =>
        Promise.resolve(version)
    );

    jest.spyOn(tnoodleApi, "fetchZip").mockImplementation((...payload) => {
        // payload[0] is the socket client, ignore it
        wcif = payload[1];
        mbld = payload[2];
        password = payload[3];
        translations = payload[4];

        return Promise.resolve(new Blob([]));
    });

    jest.spyOn(wcaApi, "fetchVersionInfo").mockImplementation(() =>
        Promise.resolve(scrambleProgram)
    );
});

afterEach(() => {
    // cleanup on exiting
    unmountComponentAtNode(container);
    container.remove();
    container = null;

    wcif = null;
    mbld = null;
    password = null;
    translations = null;

    // Clear mock
    tnoodleApi.fetchWcaEvents.mockRestore();
    tnoodleApi.fetchFormats.mockRestore();
    tnoodleApi.fetchAvailableFmcTranslations.mockRestore();
    tnoodleApi.fetchRunningVersion.mockRestore();
    tnoodleApi.fetchZip.mockRestore();
    wcaApi.fetchVersionInfo.mockRestore();
});

it("Just generate scrambles", async () => {
    const store = createStore(Reducer);

    // Render component
    await act(async () => {
        render(
            <Provider store={store}>
                <App />
            </Provider>,
            container
        );
    });

    const scrambleButton = container.querySelector("form button");
    expect(scrambleButton.innerHTML).toEqual("Generate Scrambles");

    // Generate scrambles
    fireEvent.click(scrambleButton);

    // Only 333
    expect(wcif.events.length).toBe(1);

    expect(password).toBe("");
});

it("Changes on 333, scramble", async () => {
    const store = createStore(Reducer);

    // Render component
    await act(async () => {
        render(
            <Provider store={store}>
                <App />
            </Provider>,
            container
        );
    });

    let selects = Array.from(container.querySelectorAll("select"));

    // We add rounds of 333
    let numberOfRounds = 4;
    fireEvent.change(selects[0], { target: { value: numberOfRounds } });

    // Look for selects again
    selects = Array.from(container.querySelectorAll("select"));

    // Change 2nd round to mo3
    let roundFormat = "3";
    fireEvent.change(selects[2], { target: { value: roundFormat } });

    let inputs = Array.from(container.querySelectorAll("form input"));

    // Change 2nd round
    let scrambleSets = "6";
    let copies = "7";
    fireEvent.change(inputs[4], { target: { value: scrambleSets } });
    fireEvent.change(inputs[5], { target: { value: copies } });

    // Change password
    let newPassword = "wca123";
    fireEvent.change(inputs[1], { target: { value: newPassword } });

    // Generate scrambles
    const scrambleButton = container.querySelector("form button");
    fireEvent.click(scrambleButton);

    // Only 333
    expect(wcif.events.length).toBe(1);

    // Correct number of rounds
    expect(wcif.events[0].rounds.length).toBe(numberOfRounds);

    // Changes should be done to the 2nd round only
    wcif.events[0].rounds.forEach((round, i) => {
        if (i === 1) {
            expect(round.format).toBe(roundFormat);
            expect(round.scrambleSetCount).toBe(scrambleSets);
            expect(round.extensions[0].data.numCopies).toBe(copies);
        } else {
            expect(round.format).toBe("a");
            expect(round.scrambleSetCount).toBe(1);
            expect(round.extensions[0].data.numCopies).toBe(1);
        }

        expect(round.id).toBe("333-r" + (i + 1));

        // We only send 1 extension for now
        expect(round.extensions.length).toBe(1);
    });

    expect(password).toBe(newPassword);
});

it("Remove 333, add FMC and MBLD", async () => {
    const store = createStore(Reducer);

    // Render component
    await act(async () => {
        render(
            <Provider store={store}>
                <App />
            </Provider>,
            container
        );
    });

    const mbldEvent = "3x3x3 Multiple Blindfolded";
    const fmcEvent = "3x3x3 Fewest Moves";

    let events = Array.from(container.querySelectorAll("form table"));
    const names = [mbldEvent, fmcEvent];

    let mbldCubes = "70";

    // Pick random indexes from fmc to deselect
    let laguageKeys = Object.keys(languages);
    let numberOfLanguages = laguageKeys.length;

    // At least 1, we do not deselect every translation
    let languagesToDeselect =
        Math.floor(Math.random() * numberOfLanguages - 2) + 1;

    let languagesIndexToDelesect = _.shuffle([
        ...Array(numberOfLanguages).keys(),
    ]).slice(languagesToDeselect);

    events.forEach((event) => {
        let title = event.querySelector("h5").innerHTML;

        let rounds = event.querySelector("select");

        if (names.includes(title)) {
            fireEvent.change(rounds, { target: { value: 3 } });
        } else {
            fireEvent.change(rounds, { target: { value: 0 } });
        }

        let inputs = Array.from(event.querySelectorAll("input"));

        // Change to 70 mbld
        if (title === mbldEvent) {
            fireEvent.change(inputs[inputs.length - 1], {
                target: { value: mbldCubes },
            });
        } else if (title === fmcEvent) {
            // Open translations
            fireEvent.click(event.querySelector("button"));

            // Deselesect random translations
            let checkboxes = event.querySelectorAll("input[type=checkbox]");

            languagesIndexToDelesect.forEach((index) =>
                fireEvent.click(checkboxes[index])
            );
        }
    });

    // Generate scrambles
    const scrambleButton = container.querySelector("form button");
    fireEvent.click(scrambleButton);

    expect(wcif.events.length).toBe(events.length);

    expect(mbld).toBe(mbldCubes);

    let selected = translations
        .filter((translation) => translation.status)
        .map((translation) => translation.id);

    let deselected = translations
        .filter((translation) => !translation.status)
        .map((translation) => translation.id)
        .sort();

    // Deselected should be with status false
    expect(deselected).toEqual(
        languagesIndexToDelesect.map((index) => laguageKeys[index]).sort()
    );

    // Selected and deselected should cover every languages
    expect([...selected, ...deselected].sort()).toStrictEqual(
        laguageKeys.sort()
    );
});

it("Online user", async () => {
    const store = createStore(Reducer);

    const maxCubes = "70";

    // Allow downloads
    global.URL.createObjectURL = jest.fn();

    jest.spyOn(wcaApi, "isLogged").mockImplementation(() => true);

    jest.spyOn(
        wcaApi,
        "getUpcomingManageableCompetitions"
    ).mockImplementation(() => Promise.resolve(competitions));

    jest.spyOn(wcaApi, "fetchMe").mockImplementation(() => Promise.resolve(me));

    jest.spyOn(
        wcaApi,
        "getCompetitionJson"
    ).mockImplementation((competitionId) =>
        Promise.resolve(wcifs[competitionId])
    );

    jest.spyOn(tnoodleApi, "fetchBestMbldAttempt").mockImplementation(() =>
        Promise.resolve({ solved: maxCubes, attempted: maxCubes, time: 3012 })
    );

    jest.spyOn(
        tnoodleApi,
        "fetchSuggestedFmcTranslations"
    ).mockImplementation(() => Promise.resolve(["de", "es", "pt-BR"]));

    // Render component
    await act(async () => {
        render(
            <Provider store={store}>
                <App />
            </Provider>,
            container
        );
    });

    let competitionButtons = Array.from(
        container.querySelectorAll("ul button")
    );

    let scrambleButton = container.querySelector("form button");

    // Skip Manual Selection, click the other buttons
    for (let i = 0; i < competitions.length; i++) {
        // Select current competition
        await act(async () => {
            // +1 to skip manual selection
            competitionButtons[i + 1].dispatchEvent(
                new MouseEvent("click", { bubbles: true })
            );
        });

        await act(async () => {
            scrambleButton.dispatchEvent(
                new MouseEvent("click", { bubbles: true })
            );
        });

        // We should send received wcif to tnoodle
        expect(wcif).toStrictEqual(wcifs[competitions[i].id]);

        // Download
        await act(async () => {
            scrambleButton.dispatchEvent(
                new MouseEvent("click", { bubbles: true })
            );
        });

        // We should warn in case of mbld
        if (
            !!store
                .getState()
                .wcif.events.find((event) => event.id === "333mbf") &&
            store.getState().bestMbldAttempt > store.getState().mbld
        ) {
            let items = container.querySelectorAll("tfoot tr th[colspan]");
            expect(items[items.length - 1].innerHTML).toContain(
                `a competitor who already tried ${maxCubes} at a competition. Proceed if you are really certain of it.`
            );
        }
    }

    // Get back to manual selection
    await act(async () => {
        competitionButtons[0].dispatchEvent(
            new MouseEvent("click", { bubbles: true })
        );
    });

    await act(async () => {
        scrambleButton.dispatchEvent(
            new MouseEvent("click", { bubbles: true })
        );
    });

    // After manual selection, events should be restored
    expect(store.getState().wcif.events).toStrictEqual(defaultWcif.events);

    // Wcifs should be cached
    Object.keys(wcifs).forEach((competitionId) => {
        expect(store.getState().cachedObjects[competitionId].wcif).toEqual(
            wcifs[competitionId]
        );
    });

    // Click all buttons again
    for (let i = 0; i < competitionButtons.length; i++) {
        await act(async () => {
            competitionButtons[i].dispatchEvent(
                new MouseEvent("click", { bubbles: true })
            );
        });
    }

    // On the 2nd competition selection, we should use cached information,
    // so no wcif should be called
    expect(wcaApi.getCompetitionJson).toHaveBeenCalledTimes(
        competitions.length
    );

    global.URL.createObjectURL.mockRestore();
    wcaApi.isLogged.mockRestore();
    wcaApi.getUpcomingManageableCompetitions.mockRestore();
    wcaApi.fetchMe.mockRestore();
    wcaApi.getCompetitionJson.mockRestore();
    tnoodleApi.fetchBestMbldAttempt.mockRestore();
    tnoodleApi.fetchSuggestedFmcTranslations.mockRestore();
});

it("Comfort features should not block zip generation", async () => {
    const store = createStore(Reducer);

    // Allow downloads
    global.URL.createObjectURL = jest.fn();

    jest.spyOn(wcaApi, "isLogged").mockImplementation(() => true);

    jest.spyOn(
        wcaApi,
        "getUpcomingManageableCompetitions"
    ).mockImplementation(() => Promise.resolve(competitions));

    jest.spyOn(wcaApi, "fetchMe").mockImplementation(() => Promise.resolve(me));

    jest.spyOn(
        wcaApi,
        "getCompetitionJson"
    ).mockImplementation((competitionId) =>
        Promise.resolve(wcifs[competitionId])
    );

    // Comfort features
    jest.spyOn(tnoodleApi, "fetchBestMbldAttempt").mockImplementation(() =>
        Promise.resolve(undefined)
    );

    jest.spyOn(
        tnoodleApi,
        "fetchSuggestedFmcTranslations"
    ).mockImplementation(() => Promise.resolve(undefined));

    // Render component
    await act(async () => {
        render(
            <Provider store={store}>
                <App />
            </Provider>,
            container
        );
    });

    let competitionButtons = Array.from(
        container.querySelectorAll("ul button")
    );

    let scrambleButton = container.querySelector("form button");

    // Click competitions
    for (let i = 0; i < competitionButtons.length; i++) {
        await act(async () => {
            competitionButtons[i].dispatchEvent(
                new MouseEvent("click", { bubbles: true })
            );
        });

        // Round changes from previous tests also changes defaultWcif
        // to avoid empty rounds, we try to change rounds here
        // It should have effect just on in Manual Selection
        fireEvent.change(container.querySelector("select"), {
            target: { value: 1 },
        });

        await act(async () => {
            scrambleButton.dispatchEvent(
                new MouseEvent("click", { bubbles: true })
            );
        });

        await act(async () => {
            scrambleButton.dispatchEvent(
                new MouseEvent("click", { bubbles: true })
            );
        });
    }

    expect(tnoodleApi.fetchZip).toHaveBeenCalledTimes(
        competitionButtons.length
    );

    global.URL.createObjectURL.mockRestore();
    wcaApi.isLogged.mockRestore();
    wcaApi.getUpcomingManageableCompetitions.mockRestore();
    wcaApi.fetchMe.mockRestore();
    wcaApi.getCompetitionJson.mockRestore();
    tnoodleApi.fetchBestMbldAttempt.mockRestore();
    tnoodleApi.fetchSuggestedFmcTranslations.mockRestore();
});
