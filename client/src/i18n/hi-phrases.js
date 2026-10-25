// All Hindi texts that are NOT the small structured keys. Kept in its own file so it is downloaded
// only when a visitor chooses Hindi (see runtime.js).
import { hiUi } from "./hi-ui";
import { hiData } from "./hi-data";

export const hiPhrases = { ...hiUi, ...hiData };
