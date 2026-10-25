// All Odia texts that are NOT the small structured keys: screens, server messages and curated data.
// Kept in its own file so it is downloaded only when a visitor chooses Odia (see runtime.js).
import { orUi1 } from "./or-ui-1";
import { orUi2 } from "./or-ui-2";
import { orUi3 } from "./or-ui-3";
import { orUi4 } from "./or-ui-4";
import { orServer } from "./or-server";
import { orData } from "./or-data";

export const orPhrases = { ...orUi1, ...orUi2, ...orUi3, ...orUi4, ...orServer, ...orData };
