// ==UserScript==
// @name         AMQ Japanese Dropdown
// @namespace    https://github.com/Mxyuki
// @version      1.2.0
// @description  Shows anime titles in Japanese (kanji / kana) in the AMQ answer dropdown, answers and song info.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @grant        none
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqJapaneseDropdown.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqJapaneseDropdown.user.js
// ==/UserScript==

"use strict";

if (document.querySelector("#loginPage")) return;

const NAMES_URL = "https://raw.githubusercontent.com/Mxyuki/amqJP/main/japaneseNames.json";
const SCRIPT_TITLE = "AMQ Japanese Dropdown";
const MAX_SUGGESTIONS = 25;
// Parameter positions in AMQ's QuizInfoContainer.prototype.showInfo.
const SHOW_INFO_ANIME_NAMES_INDEX = 0;
const SHOW_INFO_ALT_NAMES_INDEX = 13;
const SHOW_INFO_ANN_ID_INDEX = 21;

const amqNameByLabel = new Map();
const japaneseTitleByAnnId = new Map();
const japaneseTitleByAmqName = new Map();
let japaneseAnime = [];

const waitForGame = setInterval(() => {
  if (!document.querySelector("#loadingScreen")?.classList.contains("hidden")) return;
  clearInterval(waitForGame);
  setup();
}, 500);

async function setup() {
  try {
    japaneseAnime = await fetchJapaneseNames();
  } catch (error) {
    messageDisplayer.displayMessage(SCRIPT_TITLE, `Could not load the Japanese name list (${error.message}).`);
    return;
  }
  indexJapaneseTitles();

  replaceAutocomplete();
  keepJapaneseAnswers();
  showJapaneseSongInfo();
  showJapanesePlayerAnswers();
}

function indexJapaneseTitles() {
  for (const { annId, native, romaji, english } of japaneseAnime) {
    const title = normalizeTitle(native);
    japaneseTitleByAnnId.set(annId, title);
    for (const name of [romaji, english]) {
      const key = toAnswerKey(name);
      if (key && !japaneseTitleByAmqName.has(key)) japaneseTitleByAmqName.set(key, title);
    }
  }
}

async function fetchJapaneseNames() {
  const response = await fetch(NAMES_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const { anime } = await response.json();
  return anime;
}

function replaceAutocomplete() {
  AutoCompleteController.prototype.newList = function () {
    this.awesomepleteInstance?.destroy();
    this.awesomepleteInstance = buildJapaneseAutocomplete(this.$input[0], this.list);
  };

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

function normalizeTitle(title) {
  return title.normalize("NFKC").replace(/\s+/g, " ").trim();
}
