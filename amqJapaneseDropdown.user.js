// ==UserScript==
// @name         AMQ Japanese Dropdown
// @namespace    https://github.com/Mxyuki
// @version      1.4.0
// @description  Shows anime titles in Japanese (kanji / kana) in the AMQ answer dropdown, answers and song info.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @downloadURL  https://raw.githubusercontent.com/Mxyuki/amqJP/main/amqJapaneseDropdown.user.js
// @updateURL    https://raw.githubusercontent.com/Mxyuki/amqJP/main/amqJapaneseDropdown.user.js
// ==/UserScript==

"use strict";

if (document.querySelector("#loginPage")) return;

const NAMES_URL = "https://raw.githubusercontent.com/Mxyuki/amqJP/main/japaneseNames.json";
const ANILIST_URL = "https://graphql.anilist.co";
const KITSU_ANIME_URL = "https://kitsu.io/api/edge/anime";
const SCRIPT_TITLE = "AMQ Japanese Dropdown";
const GITHUB_NAMES_KEY = "githubNames";
const LOOKED_UP_NAMES_KEY = "lookedUpNames";
const LIBRARY_REQUEST_INTERVAL_MS = 250;
const LIBRARY_REPLY_TIMEOUT_MS = 5000;
const ANILIST_IDS_PER_REQUEST = 50;
const KITSU_IDS_PER_REQUEST = 20;
const SEARCHES_PER_REQUEST = 10;
const RESULTS_PER_SEARCH = 5;
const ANILIST_REQUEST_INTERVAL_MS = 2100;
const DEFAULT_RETRY_SECONDS = 60;
const MEDIA_FRAGMENT =
  "fragment media on Media { id idMal title { romaji english native } synonyms startDate { year } }";
const JAPANESE_SCRIPT = /[぀-ヿ㐀-鿿ｦ-ﾟ]/;
const MAX_SUGGESTIONS = 25;
// Parameter positions in AMQ's QuizInfoContainer.prototype.showInfo.
const SHOW_INFO_ANIME_NAMES_INDEX = 0;
const SHOW_INFO_ALT_NAMES_INDEX = 13;
const SHOW_INFO_ANN_ID_INDEX = 21;

const amqNameByLabel = new Map();
const japaneseTitleByAnnId = new Map();
const japaneseTitleByAmqName = new Map();
const japaneseAnime = [];

const waitForGame = setInterval(() => {
  if (!document.querySelector("#loadingScreen")?.classList.contains("hidden")) return;
  clearInterval(waitForGame);
  setup();
}, 500);

async function setup() {
  let githubNames;
  try {
    githubNames = await loadGithubNames();
  } catch (error) {
    messageDisplayer.displayMessage(SCRIPT_TITLE, `Could not load the Japanese name list (${error.message}).`);
    return;
  }
  const lookedUpNames = GM_getValue(LOOKED_UP_NAMES_KEY, { masterListId: null, anime: [] });
  addJapaneseAnime([...githubNames.anime, ...lookedUpNames.anime]);

  replaceAutocomplete();
  keepJapaneseAnswers();
  showJapaneseSongInfo();
  showJapanesePlayerAnswers();

  try {
    await addMissingNames(lookedUpNames);
  } catch (error) {
    messageDisplayer.displayMessage(SCRIPT_TITLE, `Could not look up new anime (${error.message}).`);
  }
}

// The saved copy keeps the script working when GitHub is unreachable. "no-cache" only revalidates,
// so an unchanged list is not downloaded again.
async function loadGithubNames() {
  const saved = GM_getValue(GITHUB_NAMES_KEY, null);
  try {
    const response = await fetch(NAMES_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const names = await response.json();
    if (names.generatedAt !== saved?.generatedAt) GM_setValue(GITHUB_NAMES_KEY, names);
    return names;
  } catch (error) {
    if (saved) return saved;
    throw error;
  }
}

function addJapaneseAnime(entries) {
  for (const entry of entries) {
    if (japaneseTitleByAnnId.has(entry.annId)) continue;
    japaneseAnime.push(entry);
    indexJapaneseTitle(entry);
  }
}

function indexJapaneseTitle({ annId, native, romaji, english }) {
  const title = normalizeTitle(native);
  japaneseTitleByAnnId.set(annId, title);
  for (const name of [romaji, english]) {
    const key = toAnswerKey(name);
    if (key && !japaneseTitleByAmqName.has(key)) japaneseTitleByAmqName.set(key, title);
  }
}

// Anime added to AMQ after the GitHub list was built are looked up once per master list version. Each source
// only gets the anime the previous ones missed: AniList by id, then Kitsu (AniList deletes many recaps and
// specials), then AniList by title.
async function addMissingNames(lookedUpNames) {
  const reply = await sendLibraryCommand("get current master list id");
  if (!reply || reply.masterListId === lookedUpNames.masterListId) return;

  const masterListAnime = await fetchMasterListAnime(reply.masterListId);
  const missing = masterListAnime.filter(({ annId }) => !japaneseTitleByAnnId.has(annId));
  const siteIdsByAnnId = await requestSiteIds(missing);
  const sources = [
    (animeList) => findNamesOnAniList(animeList, siteIdsByAnnId),
    (animeList) => findNamesOnKitsu(animeList, siteIdsByAnnId),
    findNamesByTitle,
  ];

  let foundAny = false;
  for (const findNames of sources) {
    const found = await findNames(missing.filter(({ annId }) => !japaneseTitleByAnnId.has(annId)));
    keepFoundNames(lookedUpNames, found);
    foundAny ||= found.length > 0;
  }

  GM_setValue(LOOKED_UP_NAMES_KEY, { ...lookedUpNames, masterListId: reply.masterListId });
  if (foundAny) refreshAutocomplete();
}

function keepFoundNames(lookedUpNames, entries) {
  addJapaneseAnime(entries);
  lookedUpNames.anime.push(...entries);
  GM_setValue(LOOKED_UP_NAMES_KEY, lookedUpNames);
}

// Resolves to null when AMQ does not answer, so one dropped request cannot stall the lookup.
function sendLibraryCommand(command, data, isReply = () => true) {
  return new Promise((resolve) => {
    const finish = (payload) => {
      clearTimeout(timeout);
      listener.unbindListener();
      resolve(payload);
    };
    const listener = new Listener(command, (payload) => isReply(payload) && finish(payload));
    const timeout = setTimeout(() => finish(null), LIBRARY_REPLY_TIMEOUT_MS);
    listener.bindListener();
    socket.sendCommand({ type: "library", command, data });
  });
}

async function fetchMasterListAnime(masterListId) {
  const response = await fetch(`/libraryMasterList?masterId=${masterListId}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const { animeMap } = await response.json();
  return Object.values(animeMap);
}

// AMQ drops library requests sent in a burst, so they go one at a time with a short pause.
async function requestSiteIds(animeList) {
  const siteIdsByAnnId = new Map();
  for (const { annId } of animeList) {
    const extendedInfo = await sendLibraryCommand(
      "get anime extended info",
      { annId },
      (payload) => payload?.annId === annId,
    );
    if (extendedInfo) {
      const { aniListId, malId, kitsuId } = extendedInfo;
      siteIdsByAnnId.set(annId, { aniListId, malId, kitsuId });
    }
    await sleep(LIBRARY_REQUEST_INTERVAL_MS);
  }
  return siteIdsByAnnId;
}

async function findNamesOnAniList(animeList, siteIdsByAnnId) {
  const siteIds = animeList.map(({ annId }) => siteIdsByAnnId.get(annId) ?? {});
  const mediaByAniListId = await fetchMediaByIds("id", siteIds.map(({ aniListId }) => aniListId));
  // Some AniList ids in AMQ are missing or stale; MAL ids cover those.
  const unresolvedMalIds = siteIds
    .filter(({ aniListId }) => !mediaByAniListId.has(aniListId))
    .map(({ malId }) => malId);
  const mediaByMalId = await fetchMediaByIds("idMal", unresolvedMalIds);

  return animeList
    .map((anime, index) => {
      const { aniListId, malId } = siteIds[index];
      return buildAniListEntry(anime, mediaByAniListId.get(aniListId) ?? mediaByMalId.get(malId));
    })
    .filter(Boolean);
}

async function fetchMediaByIds(idField, ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  const mediaById = new Map();
  const query = `query ($ids: [Int]) {
    Page(perPage: ${ANILIST_IDS_PER_REQUEST}) { media(${idField}_in: $ids, type: ANIME) { ...media } }
  } ${MEDIA_FRAGMENT}`;

  for (let start = 0; start < uniqueIds.length; start += ANILIST_IDS_PER_REQUEST) {
    const batch = uniqueIds.slice(start, start + ANILIST_IDS_PER_REQUEST);
    const { Page } = await queryAniList(query, { ids: batch });
    Page.media.forEach((media) => mediaById.set(media[idField], media));
  }
  return mediaById;
}

async function findNamesOnKitsu(animeList, siteIdsByAnnId) {
  const kitsuIds = animeList.map(({ annId }) => siteIdsByAnnId.get(annId)?.kitsuId);
  const titlesByKitsuId = await fetchKitsuTitles(kitsuIds);

  return animeList
    .map((anime, index) => buildJapaneseEntry(anime, titlesByKitsuId.get(kitsuIds[index])?.ja_jp))
    .filter(Boolean);
}

async function fetchKitsuTitles(ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  const titlesById = new Map();

  for (let start = 0; start < uniqueIds.length; start += KITSU_IDS_PER_REQUEST) {
    const url = new URL(KITSU_ANIME_URL);
    url.searchParams.set("filter[id]", uniqueIds.slice(start, start + KITSU_IDS_PER_REQUEST).join(","));
    url.searchParams.set("page[limit]", KITSU_IDS_PER_REQUEST);
    url.searchParams.set("fields[anime]", "titles");

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Kitsu HTTP ${response.status}`);
    const { data } = await response.json();
    data.forEach(({ id, attributes }) => titlesById.set(Number(id), attributes.titles));
  }
  return titlesById;
}

async function findNamesByTitle(animeList) {
  const found = [];
  for (let start = 0; start < animeList.length; start += SEARCHES_PER_REQUEST) {
    found.push(...(await searchAniList(animeList.slice(start, start + SEARCHES_PER_REQUEST))));
  }
  return found;
}

async function searchAniList(animeList) {
  const variables = Object.fromEntries(
    animeList.map(({ mainNames }, index) => [`search${index}`, mainNames.JA ?? mainNames.EN]),
  );
  const data = await queryAniList(buildSearchQuery(animeList.length), variables);

  return animeList
    .map((anime, index) => buildAniListEntry(anime, findMatchingMedia(anime, data[`result${index}`].media)))
    .filter(Boolean);
}

// One aliased Page per anime lets a single request search several titles.
function buildSearchQuery(count) {
  const indexes = [...Array(count).keys()];
  const parameters = indexes.map((index) => `$search${index}: String`).join(", ");
  const pages = indexes.map(
    (index) =>
      `result${index}: Page(perPage: ${RESULTS_PER_SEARCH}) ` +
      `{ media(search: $search${index}, type: ANIME) { ...media } }`,
  );
  return `query (${parameters}) { ${pages.join(" ")} } ${MEDIA_FRAGMENT}`;
}

// Requests are spaced to stay under AniList's rate limit; a 429 waits for the time AniList asks.
async function queryAniList(query, variables) {
  for (;;) {
    await sleep(ANILIST_REQUEST_INTERVAL_MS);
    const response = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
    });

    if (response.status === 429) {
      const retrySeconds = Number(response.headers.get("retry-after")) || DEFAULT_RETRY_SECONDS;
      await sleep(retrySeconds * 1000);
      continue;
    }

    const body = await response.json();
    if (!response.ok || body.errors) throw new Error(`AniList HTTP ${response.status}`);
    return body.data;
  }
}

// AniList search is fuzzy: only accept a title matching one of AMQ's names, preferring the same year.
function findMatchingMedia(anime, results) {
  const amqNames = new Set(anime.names.map(({ name }) => toMatchKey(name)));
  const matches = results.filter(({ title, synonyms }) =>
    [title.romaji, title.english, ...synonyms].some((name) => name && amqNames.has(toMatchKey(name))),
  );
  return matches.find(({ startDate }) => startDate.year === anime.year) ?? matches[0];
}

function buildAniListEntry(anime, media) {
  return media && buildJapaneseEntry(anime, media.title.native, media.synonyms);
}

function buildJapaneseEntry({ annId, mainNames }, title, synonyms = []) {
  const native = title?.trim();
  if (!native) return null;

  const japaneseSynonyms = synonyms
    .map((name) => name.trim())
    .filter((name) => name !== native && JAPANESE_SCRIPT.test(name));
  return {
    annId,
    native,
    ...(japaneseSynonyms.length && { synonyms: [...new Set(japaneseSynonyms)] }),
    romaji: mainNames.JA,
    english: mainNames.EN,
  };
}

function replaceAutocomplete() {
  AutoCompleteController.prototype.newList = function () {
    this.awesomepleteInstance?.destroy();
    this.awesomepleteInstance = buildJapaneseAutocomplete(this.$input[0], this.list);
  };

  refreshAutocomplete();
}

function refreshAutocomplete() {
  const { autoCompleteController } = quiz.answerInput.typingInput;
  if (autoCompleteController.list.length) autoCompleteController.newList();
}

// The server only accepts AMQ's own names: send the AMQ name while the input and answer state keep the Japanese title.
function keepJapaneseAnswers() {
  const { typingInput } = quiz.answerInput;
  const { quizAnswerState } = typingInput;
  const sendAnswer = Object.getPrototypeOf(Object.getPrototypeOf(typingInput)).submitAnswer;
  let lastAnswer = null;

  typingInput.submitAnswer = (showState) => {
    const label = typingInput.$input.val();
    if (!label) return;
    lastAnswer = { label, amqName: amqNameByLabel.get(label.trim()) ?? label };
    quizAnswerState.submitAnswer(label, showState);
    sendAnswer.call(typingInput, lastAnswer.amqName);
  };

  // The server echoes the AMQ name back; map it to the Japanese title so AMQ's answer check still matches.
  const confirmAnswer = quizAnswerState.answerListener.callback;
  quizAnswerState.answerListener.callback = (payload) => {
    const isLastAnswer = payload.answer === lastAnswer?.amqName;
    confirmAnswer(isLastAnswer ? { ...payload, answer: lastAnswer.label } : payload);
  };
}

function showJapaneseSongInfo() {
  const { showInfo } = QuizInfoContainer.prototype;

  QuizInfoContainer.prototype.showInfo = function (...args) {
    const japaneseTitle = japaneseTitleByAnnId.get(args[SHOW_INFO_ANN_ID_INDEX]);
    if (japaneseTitle) {
      const { romaji, english } = args[SHOW_INFO_ANIME_NAMES_INDEX];
      const replacedName = options.useRomajiNames ? romaji : english;
      args[SHOW_INFO_ANIME_NAMES_INDEX] = { romaji: japaneseTitle, english: japaneseTitle };
      args[SHOW_INFO_ALT_NAMES_INDEX] = [replacedName, ...args[SHOW_INFO_ALT_NAMES_INDEX]];
    }
    return showInfo.apply(this, args);
  };
}

// Every player answer (typed, team, results) goes through this setter; only the displayed text changes,
// the stored answer and its hover popover keep what the player actually sent.
function showJapanesePlayerAnswers() {
  const answerProperty = Object.getOwnPropertyDescriptor(QuizAvatarSlot.prototype, "answer");

  Object.defineProperty(QuizAvatarSlot.prototype, "answer", {
    ...answerProperty,
    set(answer) {
      answerProperty.set.call(this, answer);
      const japaneseTitle = japaneseTitleByAmqName.get(toAnswerKey(answer));
      if (!japaneseTitle) return;
      this.$answerContainerText.text(japaneseTitle);
      this.updateAnswerFontSize();
    },
  });
}

function buildJapaneseAutocomplete(input, amqNames) {
  const suggestions = buildSuggestions(amqNames);
  const searchTextByLabel = new Map(suggestions.map(({ label, searchText }) => [label, searchText]));
  const labels = [...searchTextByLabel.keys()];

  amqNameByLabel.clear();
  suggestions.forEach(({ label, amqName }) => amqNameByLabel.set(label, amqName));

  const autocomplete = new AmqAwesomeplete(input, { list: labels, minChars: 1, maxItems: MAX_SUGGESTIONS }, true);
  autocomplete.filter = (label, query) => new RegExp(query.trim(), "i").test(searchTextByLabel.get(`${label}`));
  autocomplete.letterLists = buildLetterLists(labels, searchTextByLabel);
  return autocomplete;
}

function buildSuggestions(amqNames) {
  const available = new Set(amqNames);
  const covered = new Set();
  const candidates = [];

  for (const { native, synonyms = [], romaji, english } of japaneseAnime) {
    const ownNames = [romaji, english].filter((name) => available.has(name));
    if (!ownNames.length) continue;
    ownNames.forEach((name) => covered.add(name));
    candidates.push({
      label: normalizeTitle(native),
      amqName: ownNames[0],
      searchText: buildSearchText([native, ...synonyms, romaji, english]),
    });
  }

  for (const name of available) {
    if (covered.has(name)) continue;
    candidates.push({ label: normalizeTitle(name), amqName: name, searchText: buildSearchText([name]) });
  }

  return disambiguateLabels(candidates);
}

// Some Japanese titles are shared by several AMQ entries (sequels, specials); append the AMQ name to tell them apart.
function disambiguateLabels(candidates) {
  const amqNamesByLabel = new Map();
  for (const { label, amqName } of candidates) {
    if (!amqNamesByLabel.has(label)) amqNamesByLabel.set(label, new Set());
    amqNamesByLabel.get(label).add(amqName);
  }

  const seen = new Set();
  return candidates
    .map((candidate) => {
      const isShared = amqNamesByLabel.get(candidate.label).size > 1;
      return isShared ? { ...candidate, label: `${candidate.label} (${candidate.amqName})` } : candidate;
    })
    .filter(({ label }) => !seen.has(label) && seen.add(label));
}

// AMQ narrows suggestions by the first typed character, so index the full search text, not just the label.
function buildLetterLists(labels, searchTextByLabel) {
  const index = { options: { list: labels, data: (label) => ({ label: searchTextByLabel.get(label) }) } };
  AmqAwesomeplete.prototype.buildLetterList.call(index);
  return index.letterLists;
}

function buildSearchText(names) {
  const text = names.filter(Boolean).map(normalizeTitle).join("\n");
  return text.includes("'") ? `${text}\n${text.replace(/'/g, "")}` : text;
}

function toAnswerKey(answer) {
  return typeof answer === "string" ? normalizeTitle(answer).toLowerCase() : "";
}

function toMatchKey(name) {
  return normalizeTitle(name).toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function normalizeTitle(title) {
  return title.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
