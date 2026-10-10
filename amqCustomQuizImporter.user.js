// ==UserScript==
// @name         AMQ Custom Quiz Importer
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      3.2
// @description  Import songs from AnisongDB files, custom lists, ID lists, the Song Library or your Song History into community quizzes, then bulk edit them.
// @author       Myuki
// @match        https://animemusicquiz.com/*
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqCustomQuizImporter.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqCustomQuizImporter.user.js
// @grant        none
// ==/UserScript==

"use strict";

if (document.querySelector("#loginPage")) return;

const SONG_TYPES = { 1: "OP", 2: "ED", 3: "IN" };
const SONG_TYPE_LONG_NAMES = { OP: "Opening", ED: "Ending", IN: "Insert Song" };
const SEASONS = ["Winter", "Spring", "Summer", "Fall"];
const SONG_CATEGORIES = { 0: "None", 1: "Instrumental", 2: "Chanting", 3: "Character", 4: "Standard" };
const RATINGS = { 0: "unrated", 1: "liked", 2: "disliked" };
const PLAYBACK_SPEEDS = [1, 1.5, 2, 4];
const GUESS_MODES = [
  { key: "song", label: "Song", icon: "fa-music" },
  { key: "tinyVideo", label: "Tiny video", icon: "fa-video-camera" },
  { key: "blurVideo", label: "Blurred video", icon: "fa-eye-slash" },
];
const PLAYABLE_KINDS = new Set(["song", "anime", "algorithm"]);
const SPECIAL_KINDS = ["algorithm", "message", "title"];
const OVERRIDE_KEYS = ["guessTime", "samplePoint", "playBackSpeed", "guessModes"];
const NAME_MAX_LENGTH = 30;
const MESSAGE_MAX_LENGTH = 150;
const TITLE_MAX_LENGTH = 25;
const MESSAGE_SECONDS_MAX = 60;
const MASTER_LIST_TIMEOUT = 30000;
const DOWNLOAD_URL_LIFETIME = 60000;
const RENDERED_ROW_LIMIT = 1000;
const AUTO_SCROLL_EDGE = 60;
const AUTO_SCROLL_MAX_SPEED = 24;

const HELP = {
  guessTime:
    "How long players have to answer. A range like 10-30 picks a random time for each song. Extra guess time is added on top.",
  samplePoint: "Where the clip starts, in percent of the song. A range like 0-100 picks a random spot each time.",
  playBackSpeed: "How fast the clip plays. Selecting several speeds picks one at random each time.",
  guessModes: "What players get: the song only, a tiny video or a blurred video. Several modes can be enabled.",
  numberOfSongs: "How many songs AMQ can pick from this anime during the quiz.",
  includeSongTypes: "Which of this anime's songs AMQ can pick from.",
  delay: "Seconds before the message appears once its turn comes.",
  time: "Seconds the message stays on screen before the quiz moves on to the next block.",
  videoDisplay:
    "During the next song's guessing: the message appears while players guess the song that follows it. After the previous song's answer: it appears while the answer of the song before it is shown.",
  avatar: "The avatar that says the message. Leave it empty to show the text alone.",
  connectUp:
    "Linked blocks always play right after each other, for example a message and the song it introduces. This links the block to the one right above it.",
  connectDown:
    "Linked blocks always play right after each other, for example a message and the song it introduces. This links the block to the one right below it.",
  locked: "Keeps this block at this exact spot in its rule block, even when the rule block plays in random order.",
  songCount: "How many songs this rule block plays. When it holds more blocks than that, AMQ picks among them.",
  randomOrder: "Random picks the blocks in any order. Sequential plays them from top to bottom.",
  duplicates: "Whether the same anime can be picked more than once from this rule block.",
  settingModes:
    "Keep leaves every block as it is. Block default removes the block's own value so the rule block setting applies. Custom sets a new value.",
  fitSongsPlayed:
    "Sets this rule block's songs played to the number of songs in it, so every block is played once instead of AMQ picking only some of them.",
  simulation:
    "A sample run of the quiz from its settings. AMQ picks the real songs when the quiz starts, so every run differs and edge cases such as duplicate handling may not match exactly.",
  ruleBlockRandomOrder: "Plays the rule blocks in a random order during the quiz instead of from top to bottom.",
  historyResults:
    "Keeps only the songs you guessed right, got wrong, or did not answer (for example while spectating).",
  dubsAndRebroadcasts:
    "Dubs are songs from dubbed versions of an anime. Rebroadcasts are songs only used when an anime was re-aired.",
};

const DEFAULT_RULE_SETTINGS = {
  randomOrder: true,
  songCount: 20,
  duplicates: true,
  guessTime: { guessTime: 20, extraGuessTime: 0 },
  samplePoint: { samplePoint: [0, 100] },
  playBackSpeed: { playBackSpeed: 1 },
  guessModes: { song: true, tinyVideo: false, blurVideo: false },
};

const knownDifficulties = new Map();
const recordCache = new Map();

let nextEntryId = 1;
let nextRuleBlockId = 1;
let activeMenu = null;
let clipboard = [];

const limits = () => ({
  ruleBlocks: CustomQuizBuilder.prototype.MAX_RULE_BLOCKS,
  songs: CustomQuizBuilder.prototype.MAX_SONG_COUNT,
  entries: CustomQuizCreator.prototype.MAX_BLOCK_COUNT,
  algorithm: CustomQuizBuilder.prototype.MAX_ALGORIHMN_BLOCKS,
  message: CustomQuizBuilder.prototype.MAX_MESSAGE_BLOCKS,
  title: CustomQuizBuilder.prototype.MAX_TITLE_BLOCKS,
});

const waitForGame = setInterval(() => {
  if (!document.querySelector("#loadingScreen")?.classList.contains("hidden")) return;
  clearInterval(waitForGame);
  setup();
}, 500);

function setup() {
  document.head.append(el("style", { textContent: STYLE }));
  setupTooltips();
  addCommunityImportButton();
  showPublicQuizzesAfterBuilding();
  addCreatorEditorButton();
  addLibraryBuildButton();
}

function loadMasterList() {
  if (Object.keys(libraryCacheHandler.animeCache).length) return Promise.resolve();
  return new Promise((resolve, reject) => {
    libraryCacheHandler.getCache(resolve);
    setTimeout(() => reject(new Error("AMQ did not send its song list. Try again in a minute.")), MASTER_LIST_TIMEOUT);
  });
}

function animeRecord(annId) {
  return cachedRecord(`anime:${annId}`, () => {
    const anime = libraryCacheHandler.getCachedAnime(annId);
    return anime && buildAnimeRecord(anime);
  });
}

function songRecord(annSongId) {
  return cachedRecord(`song:${annSongId}`, () => {
    const song = libraryCacheHandler.getCachedAnnSongEntry(annSongId);
    return song && buildSongRecord(song);
  });
}

function cachedRecord(key, build) {
  if (!recordCache.has(key)) {
    const record = build();
    recordCache.set(key, record ? indexNames(record) : null);
  }
  return recordCache.get(key);
}

function indexNames(record) {
  record.searchNames = {
    anime: record.animeNames.map(normalize),
    song: [normalize(record.songName)],
    artist: record.artistNames.map(normalize),
    composer: record.composerNames.map(normalize),
    arranger: record.arrangerNames.map(normalize),
  };
  return record;
}

function buildAnimeRecord(anime) {
  const season = SEASONS[anime.seasonId] ?? "";
  return {
    annId: anime.annId,
    type: "ANIME",
    typeLabel: "ANIME",
    animeName: anime.mainName,
    animeNames: anime.names.map(({ name }) => name),
    animeEnglishName: anime.mainNames.EN,
    animeRomajiName: anime.mainNames.JA,
    animeType: formatCategory(anime.category),
    year: anime.year,
    season,
    vintage: `${season} ${anime.year}`.trim(),
    vintageOrder: anime.year * 4 + anime.seasonId,
    watched: Boolean(anime.watched),
    songCounts: { OP: anime.opCount, ED: anime.edCount, IN: anime.insertCount },
    songName: "",
    artist: "",
    artistNames: [],
    composerNames: [],
    arrangerNames: [],
  };
}

function buildSongRecord(song) {
  const { songEntry } = song;
  const type = SONG_TYPES[song.type];
  return {
    ...buildAnimeRecord(libraryCacheHandler.getCachedAnime(song.annId)),
    annSongId: song.annSongId,
    songId: songEntry.songId,
    type,
    number: song.number,
    typeLabel: type === "IN" ? "IN" : `${type}${song.number}`,
    songName: songEntry.name,
    artist: songEntry.artist?.name ?? "",
    composer: songEntry.composer?.name ?? "",
    arranger: songEntry.arranger?.name ?? "",
    artistNames: creditedNames(songEntry.artist),
    composerNames: creditedNames(songEntry.composer),
    arrangerNames: creditedNames(songEntry.arranger),
    category: SONG_CATEGORIES[songEntry.category] ?? "None",
    dub: Boolean(song.dub),
    rebroadcast: Boolean(song.rebroadcast),
    rating: RATINGS[song.playerLikeStatus] ?? "unrated",
  };
}

function creditedNames(person) {
  return person ? person.getFullMemberEntryList().map(({ name }) => name) : [];
}

function formatCategory({ name, number }) {
  const label = name.charAt(0).toUpperCase() + name.slice(1);
  return number ? `${label} ${parseFloat(number)}` : label;
}

function songsOfAnime(annId) {
  return libraryCacheHandler.getCachedAnime(annId)?.allSongEtnries ?? [];
}

function toAnisongDbSong(annSongId) {
  const song = songRecord(annSongId);
  return {
    annId: song.annId,
    annSongId: song.annSongId,
    amqSongId: song.songId,
    animeENName: song.animeEnglishName ?? song.animeRomajiName,
    animeJPName: song.animeRomajiName ?? song.animeEnglishName,
    animeVintage: song.vintage,
    animeType: song.animeType,
    songType: song.type === "IN" ? SONG_TYPE_LONG_NAMES.IN : `${SONG_TYPE_LONG_NAMES[song.type]} ${song.number}`,
    songName: song.songName,
    songArtist: song.artist,
    songComposer: song.composer,
    songArranger: song.arranger,
    songCategory: song.category,
    isDub: song.dub,
    isRebroadcast: song.rebroadcast,
  };
}

class Entry {
  constructor(save) {
    this.id = nextEntryId++;
    this.save = save;
  }

  static fromSong(annSongId) {
    return new Entry({ annSongId, connectUp: false, locked: false });
  }

  static message() {
    return new Entry({
      message: "",
      avatar: null,
      videoDisplay: false,
      delay: 0,
      time: 5,
      connectUp: false,
      locked: false,
    });
  }

  static title() {
    return new Entry({ title: "", connectUp: false, locked: false });
  }

  static algorithm(settings) {
    return new Entry({ settings, connectUp: false, locked: false });
  }

  static fromAnime(annId, includeSongTypes) {
    return new Entry({
      annId,
      includeSongTypes: { ...includeSongTypes },
      numberOfSongs: 1,
      connectUp: false,
      locked: false,
    });
  }

  get kind() {
    if (this.save.annSongId) return "song";
    if (this.save.annId) return "anime";
    if (this.save.settings) return "algorithm";
    if (this.save.message !== undefined) return "message";
    return "title";
  }

  get playable() {
    return PLAYABLE_KINDS.has(this.kind);
  }

  get playCount() {
    if (this.kind === "anime") return this.save.numberOfSongs;
    if (this.kind === "algorithm") return this.save.settings.numberOfSongs;
    return this.kind === "song" ? 1 : 0;
  }

  get info() {
    switch (this.kind) {
      case "song":
        return songRecord(this.save.annSongId) ?? missingRecord("SONG", `Unknown song #${this.save.annSongId}`);
      case "anime":
        return animeRecord(this.save.annId) ?? missingRecord("ANIME", `Unknown anime #${this.save.annId}`);
      case "algorithm":
        return describedRecord("ALGO", `Algorithm block · ${this.save.settings.numberOfSongs} songs`);
      case "message":
        return describedRecord("MSG", this.save.message || "Empty message");
      default:
        return describedRecord("TITLE", this.save.title || "Empty title");
    }
  }

  clone() {
    return new Entry({ ...structuredClone(this.save), connectUp: false });
  }
}

function describedRecord(type, label) {
  return indexNames({
    type,
    typeLabel: type,
    animeName: label,
    animeNames: [label],
    songName: "",
    artist: "",
    artistNames: [],
    composerNames: [],
    arrangerNames: [],
    vintage: "",
  });
}

function missingRecord(type, label) {
  return { ...describedRecord(type, label), missing: true };
}

class RuleBlock {
  constructor(settings = {}, entries = []) {
    this.id = nextRuleBlockId++;
    this.settings = { ...structuredClone(DEFAULT_RULE_SETTINGS), ...structuredClone(settings) };
    this.entries = entries;
  }

  static fromSave({ blocks = [], ...settings }) {
    return new RuleBlock(
      settings,
      blocks.map((save) => new Entry(structuredClone(save))),
    );
  }

  get playCount() {
    return this.entries.reduce((total, entry) => total + entry.playCount, 0);
  }

  fitSongCount(available) {
    this.settings.songCount = clamp(this.playCount, 1, available);
  }

  capSongCount() {
    this.settings.songCount = clamp(this.settings.songCount, 1, Math.max(1, this.playCount));
  }

  toSave() {
    return structuredClone({ ...this.settings, blocks: this.entries.map((entry) => entry.save) });
  }
}

class QuizDraft {
  constructor({ name = "", description = "", tags = [], ruleBlocks = [], ruleBlockRandomOrder = false } = {}) {
    this.name = name;
    this.description = description;
    this.tags = tags;
    this.randomOrder = ruleBlockRandomOrder;
    this.blocks = ruleBlocks.map((save) => RuleBlock.fromSave(save));
    if (!this.blocks.length) this.blocks.push(new RuleBlock());
  }

  static withEntries(name, entries) {
    const draft = new QuizDraft({ name });
    draft.blocks[0].entries = entries;
    draft.blocks[0].fitSongCount(limits().songs);
    return draft;
  }

  get songCount() {
    return this.blocks.reduce((total, block) => total + block.settings.songCount, 0);
  }

  get entryCount() {
    return this.blocks.reduce((total, block) => total + block.entries.length, 0);
  }

  get problems() {
    const max = limits();
    const problems = [];
    if (this.blocks.length > max.ruleBlocks) problems.push(`A quiz can have at most ${max.ruleBlocks} rule blocks.`);
    if (this.songCount > max.songs)
      problems.push(`A quiz can play at most ${max.songs} songs (currently ${this.songCount}).`);
    if (this.entryCount > max.entries)
      problems.push(`A quiz can hold at most ${max.entries} blocks (currently ${this.entryCount}).`);
    SPECIAL_KINDS.forEach((kind) => {
      const count = this.countOf(kind);
      if (count > max[kind]) problems.push(`A quiz can hold at most ${max[kind]} ${kind} blocks (currently ${count}).`);
    });
    return problems;
  }

  countOf(kind) {
    return this.blocks.reduce((total, block) => total + block.entries.filter((entry) => entry.kind === kind).length, 0);
  }

  toSave() {
    return {
      name: this.name,
      description: this.description,
      tags: this.tags,
      ruleBlocks: this.blocks.map((block) => block.toSave()),
      ruleBlockRandomOrder: this.randomOrder,
    };
  }
}

function buildEntries({ annSongIds, annIds }, { mode, songTypes, dubs, rebroadcasts }) {
  if (mode === "anime") {
    const includeSongTypes = { op: songTypes.OP, ed: songTypes.ED, in: songTypes.IN };
    return unique([...annIds, ...annSongIds.map((id) => libraryCacheHandler.getAnnIdFromAnnSongId(id))])
      .filter((annId) => songsOfAnime(annId).some((song) => songTypes[SONG_TYPES[song.type]]))
      .map((annId) => Entry.fromAnime(annId, includeSongTypes));
  }

  const listed = annSongIds.map((id) => libraryCacheHandler.getCachedAnnSongEntry(id)).filter(Boolean);
  const listedIds = new Set(listed.map((song) => song.annSongId));
  const fromAnime = annIds.flatMap((annId) => songsOfAnime(annId)).filter((song) => !listedIds.has(song.annSongId));
  // Songs listed more than once (like a song played in several games) stay repeated; anime only add missing songs.
  return [...listed, ...uniqueBy(fromAnime, (song) => song.annSongId)]
    .filter((song) => songTypes[SONG_TYPES[song.type]] && (dubs || !song.dub) && (rebroadcasts || !song.rebroadcast))
    .map((song) => Entry.fromSong(song.annSongId));
}

function countMissing({ annSongIds, annIds }) {
  const missingSongs = annSongIds.filter((id) => !libraryCacheHandler.getCachedAnnSongEntry(id));
  const missingAnime = annIds.filter((id) => !libraryCacheHandler.getCachedAnime(id));
  return missingSongs.length + missingAnime.length;
}

function parseImportFile(json) {
  if (json?.ruleBlocks) return { quizSave: json, annSongIds: [], annIds: [] };

  const items = Array.isArray(json) ? json : json?.songs;
  if (!Array.isArray(items)) throw new Error("The file is not an AnisongDB export, an ID list or a quiz file.");

  const annSongIds = [];
  const annIds = [];
  items.forEach((item) => {
    if (typeof item === "number") return annSongIds.push(item);
    const annSongId = item.annSongId ?? findAnnSongId(item);
    if (annSongId) {
      annSongIds.push(annSongId);
      if (Number.isFinite(item.songDifficulty)) knownDifficulties.set(annSongId, item.songDifficulty);
    } else if (item.annId) {
      annIds.push(item.annId);
    }
  });
  return { annSongIds, annIds };
}

function findAnnSongId({ annId, amqSongId }) {
  return songsOfAnime(annId).find((song) => song.songEntry.songId === amqSongId)?.annSongId;
}

function parseIdList(text) {
  return unique((text.match(/\d+/g) ?? []).map(Number));
}

function songHistoryGames() {
  return Object.values(songHistoryWindow.gamesTab.gameMap)
    .filter((game) => game.songLoad || game.songTable.rows.length)
    .sort((a, b) => b.startTime - a.startTime)
    .map((game) => ({
      room: localizationHandler.translate(game.roomNameKey),
      date: game.startTime.format("YYYY-MM-DD HH:mm"),
      get loaded() {
        return !game.songLoad;
      },
      rows: () => game.songTable.rows,
      async load() {
        game.triggerSongLoad();
        await waitUntil(() => !game.$songContainer.hasClass("hide"));
      },
    }));
}

function librarySearchSongIds() {
  const entries = expandLibrary.library?.filterApplier.filteredEntries ?? [];
  return unique(entries.flatMap((entry) => entry.searchFilterSongs.map((song) => song.annSongId)));
}

const QUERY_ALIASES = {
  t: "type",
  a: "anime",
  s: "song",
  ar: "artist",
  co: "composer",
  arr: "arranger",
  y: "year",
  cat: "category",
  format: "animetype",
  diff: "difficulty",
  b: "block",
};

const TYPE_ALIASES = { opening: "op", ending: "ed", insert: "in", ins: "in", algorithm: "algo", message: "msg" };
const SEASON_ALIASES = { autumn: "fall" };

const QUERY_FLAGS = {
  watched: ({ info }) => info.watched === true,
  unwatched: ({ info }) => info.watched === false,
  liked: ({ info }) => info.rating === "liked",
  disliked: ({ info }) => info.rating === "disliked",
  unrated: ({ info }) => info.rating === "unrated",
  dub: ({ info }) => info.dub === true,
  rebroadcast: ({ info }) => info.rebroadcast === true,
  missing: ({ info }) => info.missing === true,
  locked: ({ entry }) => Boolean(entry.save.locked),
  linked: ({ entry }) => Boolean(entry.save.connectUp),
  override: ({ entry }) => hasOverrides(entry),
};

const QUERY_FIELDS = {
  type: ({ info }, value) => {
    const target = TYPE_ALIASES[value] ?? value;
    const numbered = target.match(/^(op|ed|in)(\S+)$/);
    if (numbered) return info.type.toLowerCase() === numbered[1] && compareNumber(info.number, numbered[2]);
    return info.type.toLowerCase() === target;
  },
  anime: ({ info }, value) => matchesAny(info.searchNames.anime, value),
  song: ({ info }, value) => matchesAny(info.searchNames.song, value),
  artist: ({ info }, value) => matchesAny(info.searchNames.artist, value),
  composer: ({ info }, value) => matchesAny(info.searchNames.composer, value),
  arranger: ({ info }, value) => matchesAny(info.searchNames.arranger, value),
  year: ({ info }, value) => compareNumber(info.year, value),
  season: ({ info }, value) => info.season?.toLowerCase() === (SEASON_ALIASES[value] ?? value),
  animetype: ({ info }, value) => Boolean(info.animeType?.toLowerCase().includes(value)),
  category: ({ info }, value) => Boolean(info.category?.toLowerCase().startsWith(value)),
  difficulty: ({ info }, value) => compareNumber(knownDifficulties.get(info.annSongId), value),
  block: ({ blockNumber }, value) => compareNumber(blockNumber, value),
  id: ({ info }, value) => String(info.annSongId) === value || String(info.annId) === value,
  is: (context, value) => Boolean(QUERY_FLAGS[value]?.(context)),
};

function compileQuery(text) {
  const tokenPattern = /(-?)(?:([a-z]+):)?(?:"([^"]*)"|(\S+))/gi;
  const terms = [...text.matchAll(tokenPattern)].map(([, negated, field, quoted, bare]) => ({
    negated: Boolean(negated),
    field: field && (QUERY_ALIASES[field.toLowerCase()] ?? field.toLowerCase()),
    values: quoted === undefined ? bare.toLowerCase().split(/[|,]/).filter(Boolean) : [quoted.toLowerCase()],
  }));

  return (context) =>
    terms.every(({ negated, field, values }) => {
      const test = QUERY_FIELDS[field] ?? matchesFreeText;
      return values.some((value) => test(context, value)) !== negated;
    });
}

function matchesFreeText({ info }, value) {
  const { anime, song, artist } = info.searchNames;
  return matchesAny(anime, value) || matchesAny(song, value) || matchesAny(artist, value);
}

function matchesAny(searchNames, value) {
  const target = normalize(value);
  return searchNames.some((name) => name.includes(target));
}

function compareNumber(actual, expression) {
  if (actual === undefined || actual === null) return false;
  const range = expression.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (range) return actual >= Number(range[1]) && actual <= Number(range[2]);
  const comparison = expression.match(/^(>=|<=|>|<)?(\d+(?:\.\d+)?)$/);
  if (!comparison) return false;
  const target = Number(comparison[2]);
  switch (comparison[1]) {
    case ">=":
      return actual >= target;
    case "<=":
      return actual <= target;
    case ">":
      return actual > target;
    case "<":
      return actual < target;
    default:
      return actual === target;
  }
}

function normalize(text) {
  return replaceCharactersForSeachCharacters(String(text).toLowerCase());
}

function hasOverrides(entry) {
  return OVERRIDE_KEYS.some((key) => key in entry.save);
}

const SORTS = [
  { label: "Anime name", value: (info) => info.animeName },
  { label: "Song name", value: (info) => info.songName },
  { label: "Artist", value: (info) => info.artist },
  { label: "Vintage", value: (info) => info.vintageOrder ?? 0 },
  { label: "Song type", value: (info) => `${info.type}${String(info.number ?? 0).padStart(3, "0")}` },
];

function sortEntries(entries, sort) {
  return [...entries].sort((a, b) => {
    const [left, right] = [sort.value(a.info), sort.value(b.info)];
    return typeof left === "number" ? left - right : String(left).localeCompare(String(right));
  });
}

function linkedGroups(entries) {
  return entries.reduce((groups, entry) => {
    if (entry.save.connectUp && groups.length) groups.at(-1).push(entry);
    else groups.push([entry]);
    return groups;
  }, []);
}

function shuffleKeepingLocked(groups) {
  const isLocked = (group) => group.some((entry) => entry.save.locked);
  const free = shuffle(groups.filter((group) => !isLocked(group)));
  return groups.map((group) => (isLocked(group) ? group : free.shift()));
}

function simulateQuiz(draft) {
  const ruleBlocks = draft.randomOrder ? shuffle(draft.blocks) : draft.blocks;
  return ruleBlocks.map((block) => ({ number: draft.blocks.indexOf(block) + 1, block, ...simulateRuleBlock(block) }));
}

function simulateRuleBlock(block) {
  const { songCount, randomOrder, duplicates } = block.settings;
  const usedAnime = new Set();
  const groups = [];
  let played = 0;
  for (const group of randomOrder ? shuffleKeepingLocked(linkedGroups(block.entries)) : linkedGroups(block.entries)) {
    if (played >= songCount) break;
    const picks = pickGroup(group, songCount - played, duplicates, usedAnime);
    if (!picks) continue;
    played += picks.filter((pick) => pick.counts).length;
    groups.push(picks);
  }
  return { groups, played };
}

// Linked blocks play together, so a linked group is skipped whole when it cannot fit or has no usable song.
function pickGroup(group, budget, duplicates, usedAnime) {
  const groupAnime = new Set(usedAnime);
  const candidates = group.flatMap((entry) => pickEntry(entry, duplicates, groupAnime));
  const songs = candidates.filter((pick) => pick.counts).length;
  if (group.length > 1 && songs > budget) return null;
  if (group.some((entry) => entry.playable) && !songs) return null;
  let remaining = budget;
  const picks = candidates.filter((pick) => !pick.counts || remaining-- > 0);
  groupAnime.forEach((annId) => usedAnime.add(annId));
  return picks;
}

// AMQ's duplicate setting is about anime: the same song can play again, the same anime only when allowed.
function pickEntry(entry, duplicates, usedAnime) {
  const { save } = entry;
  switch (entry.kind) {
    case "song": {
      const info = entry.info;
      if (!duplicates && usedAnime.has(info.annId)) return [];
      usedAnime.add(info.annId);
      return [{ entry, info, counts: true }];
    }
    case "anime": {
      if (!duplicates && usedAnime.has(save.annId)) return [];
      const candidates = songsOfAnime(save.annId).filter(
        (song) => save.includeSongTypes[SONG_TYPES[song.type].toLowerCase()],
      );
      const chosen = shuffle(candidates).slice(0, save.numberOfSongs);
      if (chosen.length) usedAnime.add(save.annId);
      return chosen.map((song) => ({ entry, info: songRecord(song.annSongId), counts: true }));
    }
    case "algorithm":
      return Array.from({ length: save.settings.numberOfSongs }, () => ({ entry, info: entry.info, counts: true }));
    default:
      return [{ entry, info: entry.info, counts: false }];
  }
}

function keyCombo(event) {
  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  return [
    event.ctrlKey || event.metaKey ? "Ctrl" : null,
    event.shiftKey ? "Shift" : null,
    event.altKey ? "Alt" : null,
    key,
  ]
    .filter(Boolean)
    .join("+");
}

function formatKeys(combo) {
  return combo.replace("ArrowUp", "↑").replace("ArrowDown", "↓").replace("Escape", "Esc");
}

function shiftSelected(items, isSelected, offset) {
  const shifted = [...items];
  const indexes = [...shifted.keys()];
  (offset < 0 ? indexes : indexes.reverse()).forEach((index) => {
    const neighbour = index + offset;
    if (neighbour < 0 || neighbour >= shifted.length) return;
    if (isSelected(shifted[index]) && !isSelected(shifted[neighbour])) {
      [shifted[index], shifted[neighbour]] = [shifted[neighbour], shifted[index]];
    }
  });
  return shifted;
}

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled;
}

function parseRange(text, min, max) {
  const match = String(text)
    .trim()
    .match(/^(\d+)(?:\s*-\s*(\d+))?$/);
  if (!match) return null;
  const low = Number(match[1]);
  const high = match[2] === undefined ? low : Number(match[2]);
  if (low < min || high > max || low > high) return null;
  return match[2] === undefined ? low : [low, high];
}

function formatRange(value) {
  return Array.isArray(value) ? `${value[0]}-${value[1]}` : String(value);
}

function formatGuessTime({ guessTime, extraGuessTime }) {
  const extra = Array.isArray(extraGuessTime) ? extraGuessTime[1] > 0 : extraGuessTime > 0;
  return extra ? `${formatRange(guessTime)}+${formatRange(extraGuessTime)}` : formatRange(guessTime);
}

function formatSpeed({ playBackSpeed }) {
  return Array.isArray(playBackSpeed) ? `${playBackSpeed.join("/")}x` : `${playBackSpeed}x`;
}

function rangeInput(value, min, max, label) {
  const input = el("input", { type: "text", className: "cqiInput cqiInputShort", value: formatRange(value) });
  return {
    element: input,
    read() {
      const parsed = parseRange(input.value, min, max);
      if (parsed === null)
        throw new Error(`${label} must be a number from ${min} to ${max}, or a range like ${min}-${max}.`);
      return parsed;
    },
  };
}

function guessTimeInput(value = DEFAULT_RULE_SETTINGS.guessTime) {
  const base = rangeInput(value.guessTime, 1, 60, "Guess time");
  const extra = rangeInput(value.extraGuessTime, 0, 15, "Extra guess time");
  return {
    element: el(
      "div",
      { className: "cqiInputRow" },
      base.element,
      el("span", { className: "cqiMuted" }, "+ extra"),
      extra.element,
      el("span", { className: "cqiMuted" }, "sec"),
    ),
    read: () => ({ guessTime: base.read(), extraGuessTime: extra.read() }),
  };
}

function samplePointInput(value = DEFAULT_RULE_SETTINGS.samplePoint) {
  const point = rangeInput(value.samplePoint, 0, 100, "Sample point");
  return {
    element: el(
      "div",
      { className: "cqiInputRow" },
      point.element,
      el("span", { className: "cqiMuted" }, "% of the song, a range picks randomly"),
    ),
    read: () => ({ samplePoint: point.read() }),
  };
}

function playbackSpeedInput(value = DEFAULT_RULE_SETTINGS.playBackSpeed) {
  const selected = [value.playBackSpeed].flat();
  const toggles = toggleGroup(
    PLAYBACK_SPEEDS.map((speed) => ({ key: speed, label: `${speed}x`, on: selected.includes(speed) })),
  );
  return {
    element: el(
      "div",
      { className: "cqiInputRow" },
      toggles.element,
      el("span", { className: "cqiMuted" }, "several picks randomly"),
    ),
    read() {
      const speeds = toggles.values();
      if (!speeds.length) throw new Error("Select at least one playback speed.");
      return { playBackSpeed: speeds.length === 1 ? speeds[0] : speeds };
    },
  };
}

function guessModesInput(value = DEFAULT_RULE_SETTINGS.guessModes) {
  const toggles = toggleGroup(
    GUESS_MODES.map(({ key, label, icon: iconName }) => ({
      key,
      label: [icon(iconName), ` ${label}`],
      on: value[key],
    })),
  );
  return {
    element: toggles.element,
    read() {
      const modes = toggles.values();
      if (!modes.length) throw new Error("Select at least one guess mode.");
      return Object.fromEntries(GUESS_MODES.map(({ key }) => [key, modes.includes(key)]));
    },
  };
}

function animeSongTypesInput(value = { op: true, ed: true, in: true }) {
  const toggles = toggleGroup(
    Object.entries(SONG_TYPES).map(([, type]) => ({
      key: type.toLowerCase(),
      label: type,
      on: value[type.toLowerCase()],
    })),
  );
  return {
    element: toggles.element,
    read() {
      const types = toggles.values();
      if (!types.length) throw new Error("Select at least one song type.");
      return { op: types.includes("op"), ed: types.includes("ed"), in: types.includes("in") };
    },
  };
}

function textInput(value, maxLength, multiline) {
  const input = el(multiline ? "textarea" : "input", {
    type: multiline ? undefined : "text",
    className: `cqiInput ${multiline ? "cqiTextarea cqiMessageInput" : "cqiTextInput"}`,
    maxLength,
    value,
  });
  return { element: input, read: () => input.value };
}

function avatarInput(value) {
  let current = value ?? null;
  const preview = el("div", { className: "cqiAvatarPreview" });
  const showCurrent = () =>
    setChildren(preview, current ? avatarPreview(current) : el("span", { className: "cqiMuted" }, "No avatar"));
  showCurrent();
  const choose = () =>
    pickMessageAvatar(current, (avatar) => {
      current = avatar;
      showCurrent();
    });
  return {
    element: el("div", { className: "cqiInputRow" }, preview, button([icon("fa-user"), " Choose avatar"], choose)),
    read: () => current,
  };
}

function avatarColor({ characterId, avatarId, colorId }) {
  return storeWindow.getAvatar(characterId, avatarId)?.getColor(colorId);
}

function avatarName(avatar) {
  const color = avatarColor(avatar);
  return color ? `${color.avatarName} ${color.outfitName}` : "Avatar";
}

function avatarPreview(avatar) {
  const color = avatarColor(avatar);
  const image =
    color &&
    !color.animated &&
    el("img", {
      className: "cqiAvatarImage",
      alt: "",
      src: cdnFormater.newAvatarSrc(
        color.avatarName,
        color.outfitName,
        color.optionName,
        true,
        color.name,
        avatar.poseId,
      ),
    });
  return [image, el("span", {}, avatarName(avatar))];
}

// AMQ's avatar picker lives inside the Quiz Builder page, so it is lifted above the editor while in use.
function pickMessageAvatar(current, onPick) {
  const $container = customQuizMessageAvatarSelector.$container;
  const $home = $container.parent();
  $container.appendTo(document.body).addClass("cqiAvatarSelectorHost");
  customQuizMessageAvatarSelector.display({
    targetAvatar: current,
    displayAvatar: (characterId, avatarId, colorId, poseId) => onPick({ characterId, avatarId, colorId, poseId }),
    clearAvatar: () => onPick(null),
  });
  const observer = new MutationObserver(() => {
    if (!$container.hasClass("hide")) return;
    observer.disconnect();
    $container.removeClass("cqiAvatarSelectorHost").appendTo($home);
  });
  observer.observe($container[0], { attributes: true, attributeFilter: ["class"] });
}

function numberInput(value, min, max, label) {
  const input = el("input", { type: "number", className: "cqiInput cqiInputShort", value, min, max });
  return {
    element: input,
    read() {
      const number = Number(input.value);
      if (!Number.isInteger(number) || number < min || number > max)
        throw new Error(`${label} must be a whole number from ${min} to ${max}.`);
      return number;
    },
  };
}

function choiceInput(value, choices) {
  let current = value;
  const buttons = choices.map(([label, choice]) => toggleButton(label, choice === value, () => select(choice)));
  const select = (choice) => {
    current = choice;
    buttons.forEach((choiceButton, index) => choiceButton.classList.toggle("on", choices[index][1] === choice));
  };
  return { element: el("div", { className: "cqiToggleGroup" }, buttons), read: () => current };
}

function toggleGroup(options) {
  const buttons = options.map(({ label, on }) =>
    toggleButton(label, on, (event) => event.currentTarget.classList.toggle("on")),
  );
  return {
    element: el("div", { className: "cqiToggleGroup" }, buttons),
    values: () => options.filter((_, index) => buttons[index].classList.contains("on")).map(({ key }) => key),
  };
}

function overrideField(key, label, input) {
  return {
    key,
    label,
    clearable: true,
    appliesTo: (entry) => entry.playable,
    isSet: (entry) => key in entry.save,
    input: (entry) => input(entry.save[key]),
    set: (entry, value) => (entry.save[key] = structuredClone(value)),
    clear: (entry) => delete entry.save[key],
  };
}

const ENTRY_FIELDS = [
  overrideField("guessTime", "Guess time", guessTimeInput),
  overrideField("samplePoint", "Sample point", samplePointInput),
  overrideField("playBackSpeed", "Playback speed", playbackSpeedInput),
  overrideField("guessModes", "Guess modes", guessModesInput),
  {
    key: "numberOfSongs",
    label: "Songs per anime",
    appliesTo: (entry) => entry.kind === "anime",
    input: (entry) => numberInput(entry.save.numberOfSongs, 1, 50, "Songs per anime"),
    set: (entry, value) =>
      (entry.save.numberOfSongs = clamp(value, 1, Math.max(1, songsOfAnime(entry.save.annId).length))),
  },
  {
    key: "includeSongTypes",
    label: "Anime song types",
    appliesTo: (entry) => entry.kind === "anime",
    input: (entry) => animeSongTypesInput(entry.save.includeSongTypes),
    set: (entry, value) => (entry.save.includeSongTypes = { ...value }),
  },
  {
    key: "message",
    label: "Message",
    appliesTo: (entry) => entry.kind === "message",
    input: (entry) => textInput(entry.save.message, MESSAGE_MAX_LENGTH, true),
    set: (entry, value) => (entry.save.message = value),
  },
  {
    key: "delay",
    label: "Delay before the message (seconds)",
    appliesTo: (entry) => entry.kind === "message",
    input: (entry) => numberInput(entry.save.delay, 0, MESSAGE_SECONDS_MAX, "Delay"),
    set: (entry, value) => (entry.save.delay = value),
  },
  {
    key: "time",
    label: "Message display time (seconds)",
    appliesTo: (entry) => entry.kind === "message",
    input: (entry) => numberInput(entry.save.time, 0, MESSAGE_SECONDS_MAX, "Display time"),
    set: (entry, value) => (entry.save.time = value),
  },
  {
    key: "videoDisplay",
    label: "When the message shows",
    appliesTo: (entry) => entry.kind === "message",
    input: (entry) =>
      choiceInput(Boolean(entry.save.videoDisplay), [
        ["After the previous song's answer", false],
        ["During the next song's guessing", true],
      ]),
    set: (entry, value) => (entry.save.videoDisplay = value),
  },
  {
    key: "avatar",
    label: "Avatar",
    appliesTo: (entry) => entry.kind === "message",
    input: (entry) => avatarInput(entry.save.avatar),
    set: (entry, value) => (entry.save.avatar = value && { ...value }),
  },
  {
    key: "title",
    label: "Title",
    appliesTo: (entry) => entry.kind === "title",
    input: (entry) => textInput(entry.save.title, TITLE_MAX_LENGTH),
    set: (entry, value) => (entry.save.title = value),
  },
];

const LOCK_FIELD = {
  key: "locked",
  label: "Lock position",
  appliesTo: () => true,
  input: (entry) =>
    choiceInput(Boolean(entry.save.locked), [
      ["Locked", true],
      ["Unlocked", false],
    ]),
  set: (entry, value) => (entry.save.locked = value),
};

// AMQ stores a link on the lower block only, so linkedEntry returns the block holding it, or null without a neighbour.
function linkField(key, label, linkedEntry) {
  return {
    key,
    label,
    appliesTo: (entry) => Boolean(linkedEntry(entry)),
    input: (entry) =>
      choiceInput(Boolean(linkedEntry(entry).save.connectUp), [
        ["Linked", true],
        ["Not linked", false],
      ]),
    set: (entry, value) => (linkedEntry(entry).save.connectUp = value),
  };
}

function blockSettingField(key, label, input) {
  return {
    key,
    label,
    appliesTo: () => true,
    input: (block) => input(block.settings[key]),
    set: (block, value) => (block.settings[key] = structuredClone(value)),
  };
}

const BLOCK_FIELDS = [
  {
    key: "songCount",
    label: "Songs played",
    appliesTo: () => true,
    input: (block) => numberInput(block.settings.songCount, 1, limits().songs, "Songs played"),
    set: (block, value) => (block.settings.songCount = value),
  },
  blockSettingField("randomOrder", "Order", (value) =>
    choiceInput(value, [
      ["Random", true],
      ["Sequential", false],
    ]),
  ),
  blockSettingField("duplicates", "Duplicate anime", (value) =>
    choiceInput(value, [
      ["Allowed", true],
      ["Not allowed", false],
    ]),
  ),
  blockSettingField("guessTime", "Guess time", guessTimeInput),
  blockSettingField("samplePoint", "Sample point", samplePointInput),
  blockSettingField("playBackSpeed", "Playback speed", playbackSpeedInput),
  blockSettingField("guessModes", "Guess modes", guessModesInput),
];

function el(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([name, value]) => {
    if (value === undefined || value === null || value === false) return;
    if (name.startsWith("on")) element.addEventListener(name.slice(2), value);
    else if (name === "dataset") Object.assign(element.dataset, value);
    else if (name in element) element[name] = value;
    else element.setAttribute(name, value === true ? "" : value);
  });
  element.append(...compact(children));
  return element;
}

function setChildren(element, ...children) {
  element.replaceChildren(...compact(children));
}

function compact(children) {
  return children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false);
}

function infoIcon(text) {
  return el("i", { className: "fa fa-info-circle cqiInfo", "aria-label": text, dataset: { tip: text } });
}

function setupTooltips() {
  const tooltip = el("div", { className: "cqiTooltip" });
  document.body.append(tooltip);
  document.addEventListener("mouseover", (event) => {
    const target = event.target.closest?.(".cqiInfo");
    tooltip.classList.toggle("show", Boolean(target));
    if (!target) return;
    tooltip.textContent = target.dataset.tip;
    const box = target.getBoundingClientRect();
    const left = clamp(box.left - 12, 8, window.innerWidth - tooltip.offsetWidth - 8);
    const below = box.bottom + tooltip.offsetHeight + 8 <= window.innerHeight;
    const top = below ? box.bottom + 6 : box.top - tooltip.offsetHeight - 6;
    Object.assign(tooltip.style, { left: `${left}px`, top: `${top}px` });
  });
}

function icon(name) {
  return el("i", { className: `fa ${name}`, "aria-hidden": "true" });
}

function button(label, onclick, { className = "", title, disabled } = {}) {
  return el("button", { type: "button", className: `cqiButton ${className}`.trim(), title, disabled, onclick }, label);
}

function toggleButton(label, on, onclick, className = "cqiToggle") {
  return el("button", { type: "button", className: on ? `${className} on` : className, onclick }, label);
}

function openMenu(anchor, items) {
  closeMenu();
  const menu = el(
    "div",
    { className: "cqiMenu" },
    items.map((item) =>
      item.separator
        ? el("div", { className: "cqiMenuSeparator" })
        : el(
            "button",
            {
              type: "button",
              className: "cqiMenuItem",
              disabled: item.disabled,
              onclick: () => (closeMenu(), item.action()),
            },
            item.label,
          ),
    ),
  );
  document.body.append(menu);
  const anchorBox = anchor.getBoundingClientRect();
  const left = Math.min(anchorBox.left, window.innerWidth - menu.offsetWidth - 8);
  const top =
    anchorBox.bottom + menu.offsetHeight > window.innerHeight
      ? anchorBox.top - menu.offsetHeight - 4
      : anchorBox.bottom + 4;
  Object.assign(menu.style, { left: `${left}px`, top: `${Math.max(8, top)}px` });

  const dismiss = (event) => !menu.contains(event.target) && closeMenu();
  document.addEventListener("mousedown", dismiss);
  activeMenu = { menu, dismiss };
}

function closeMenu() {
  if (!activeMenu) return;
  activeMenu.menu.remove();
  document.removeEventListener("mousedown", activeMenu.dismiss);
  activeMenu = null;
}

function downloadJson(fileName, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  el("a", { href: url, download: fileName }).click();
  setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_LIFETIME);
}

function fileNameToQuizName(fileName) {
  return fileName
    .replace(/\.json$/i, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .slice(0, NAME_MAX_LENGTH);
}

function waitUntil(predicate, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const check = setInterval(() => {
      if (predicate()) {
        clearInterval(check);
        resolve();
      } else if (Date.now() - started > timeout) {
        clearInterval(check);
        reject(new Error("Timed out waiting for AMQ."));
      }
    }, 100);
  });
}

function uniqueBy(items, key) {
  const seen = new Set();
  return items.filter((item) => !seen.has(key(item)) && seen.add(key(item)));
}

function unique(items) {
  return [...new Set(items.filter((item) => item !== undefined && item !== null))];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

class Overlay {
  constructor(className) {
    this.root = el("div", { className: "cqiOverlay", tabIndex: -1 });
    this.window = el("div", { className: `cqiWindow ${className}` });
    this.root.append(this.window);
  }

  show() {
    document.body.append(this.root);
    this.root.focus();
  }

  close() {
    closeMenu();
    this.root.remove();
  }
}

const IMPORT_SOURCES = [
  { id: "file", label: "File", icon: "fa-file-code-o" },
  { id: "customList", label: "Custom list", icon: "fa-list-ul" },
  { id: "songIds", label: "Song IDs", icon: "fa-music" },
  { id: "animeIds", label: "Anime IDs", icon: "fa-film" },
  { id: "library", label: "Song Library", icon: "fa-search" },
  { id: "history", label: "Song History", icon: "fa-history" },
];

const HISTORY_RESULTS = [
  { key: "correct", label: "Correct", matches: (row) => Boolean(row.correctGuess) },
  { key: "wrong", label: "Wrong", matches: (row) => Boolean(row.wrongGuess) },
  { key: "unanswered", label: "Not answered", matches: (row) => !row.correctGuess && !row.wrongGuess },
];

class ImportDialog extends Overlay {
  constructor({ title, confirmLabel, source = "file", targets, onImport }) {
    super("cqiImportDialog");
    this.onImport = onImport;
    this.targets = targets;
    this.target = targets?.[0]?.value;
    this.ready = false;
    this.pending = 0;
    this.selection = { annSongIds: [], annIds: [], name: "" };
    this.options = { mode: "songs", songTypes: { OP: true, ED: true, IN: true }, dubs: true, rebroadcasts: true };

    this.tabs = el("div", { className: "cqiTabs" });
    this.sourcePanel = el("div", { className: "cqiSourcePanel" });
    this.optionsPanel = el("div", { className: "cqiOptions" });
    this.summary = el("div", { className: "cqiSummary" });
    this.confirmButton = button(confirmLabel, () => this.confirm(), { className: "cqiPrimary" });

    this.window.append(
      el(
        "div",
        { className: "cqiHeader" },
        el("h2", {}, title),
        el("div", { className: "cqiSpacer" }),
        button(icon("fa-times"), () => this.close(), { className: "cqiIconButton", title: "Close" }),
      ),
      el("div", { className: "cqiDialogBody" }, this.tabs, this.sourcePanel, this.optionsPanel),
      el(
        "div",
        { className: "cqiFooter" },
        this.summary,
        button("Cancel", () => this.close()),
        this.confirmButton,
      ),
    );
    this.root.addEventListener("keydown", (event) => event.key === "Escape" && this.close());

    this.selectSource(source);
    this.masterList = loadMasterList()
      .then(() => (this.ready = true))
      .catch((error) => (this.loadError = error.message))
      .finally(() => this.update());
  }

  selectSource(source) {
    this.source = source;
    this.selection = { annSongIds: [], annIds: [], name: "" };
    setChildren(
      this.tabs,
      IMPORT_SOURCES.map(({ id, label, icon: iconName }) =>
        toggleButton([icon(iconName), ` ${label}`], id === source, () => this.selectSource(id), "cqiTab"),
      ),
    );
    setChildren(this.sourcePanel, this.buildSourcePanel());
    this.update();
  }

  buildSourcePanel() {
    switch (this.source) {
      case "file":
        return this.buildFilePanel();
      case "customList":
        return this.buildCustomListPanel();
      case "songIds":
        return this.buildIdPanel("annSongIds", "Paste annSongIds separated by spaces, commas or new lines.");
      case "animeIds":
        return this.buildIdPanel("annIds", "Paste annIds separated by spaces, commas or new lines.");
      case "history":
        return this.buildHistoryPanel();
      default:
        return this.buildLibraryPanel();
    }
  }

  buildFilePanel() {
    const fileInput = el("input", {
      type: "file",
      accept: ".json,application/json",
      className: "hide",
      onchange: () => this.readFile(fileInput.files[0]),
    });
    const dropZone = el(
      "label",
      { className: "cqiDropZone" },
      fileInput,
      icon("fa-cloud-upload"),
      el("strong", {}, this.selection.fileName ?? "Drop a JSON file here or click to browse"),
      el(
        "span",
        { className: "cqiMuted" },
        "AnisongDB exports, files saved from the Song Library or the editor, or a plain list of annSongIds",
      ),
    );
    dropZone.addEventListener("dragover", (event) => (event.preventDefault(), dropZone.classList.add("over")));
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("over"));
    dropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropZone.classList.remove("over");
      this.readFile(event.dataTransfer.files[0]);
    });
    return [dropZone];
  }

  async readFile(file) {
    if (!file) return;
    await this.masterList;
    try {
      const parsed = parseImportFile(JSON.parse(await file.text()));
      this.selection = { ...parsed, name: parsed.quizSave?.name ?? fileNameToQuizName(file.name), fileName: file.name };
      if (parsed.annIds.length && !parsed.annSongIds.length) this.options.mode = "anime";
    } catch (error) {
      this.selection = {
        annSongIds: [],
        annIds: [],
        name: "",
        fileName: file.name,
        error: error instanceof SyntaxError ? "The file is not valid JSON." : error.message,
      };
    }
    setChildren(this.sourcePanel, this.buildFilePanel());
    this.update();
  }

  buildCustomListPanel() {
    const lists = customListHandler.sortedLists;
    if (!lists.length)
      return [
        el("p", { className: "cqiEmpty" }, "You don't have any custom lists yet. Create one from the Song Library."),
      ];

    const select = el(
      "select",
      { className: "cqiInput", onchange: () => applyList(lists[select.selectedIndex]) },
      lists.map((list) =>
        el("option", {}, `${list.name} (${plural(list.animeMap.size, "anime")}, ${plural(list.songMap.size, "song")})`),
      ),
    );
    const applyList = (list) => {
      this.selection = {
        annIds: [...list.animeMap.keys()],
        annSongIds: [...list.songMap.keys()],
        name: list.name.slice(0, NAME_MAX_LENGTH),
      };
      this.options.mode = list.onlyAnime ? "anime" : "songs";
      this.update();
    };
    applyList(lists[0]);
    return [el("label", { className: "cqiField" }, el("span", {}, "List"), select)];
  }

  buildIdPanel(key, placeholder) {
    this.options.mode = key === "annIds" ? "anime" : "songs";
    const textarea = el("textarea", {
      className: "cqiInput cqiTextarea",
      placeholder,
      oninput: () => {
        this.selection = { annSongIds: [], annIds: [], name: "", [key]: parseIdList(textarea.value) };
        this.update();
      },
    });
    return [textarea];
  }

  buildLibraryPanel() {
    const annSongIds = librarySearchSongIds();
    if (!annSongIds.length) {
      return [
        el(
          "p",
          { className: "cqiEmpty" },
          "Open the Song Library, search or filter, then come back here: the current results become the import.",
        ),
      ];
    }
    const query = expandLibrary.library.filter.currentFilter.searchQuery;
    this.selection = { annSongIds, annIds: [], name: (query || "Song Library selection").slice(0, NAME_MAX_LENGTH) };
    return [
      el("p", {}, `Your current Song Library results contain ${plural(annSongIds.length, "song")}.`),
      button([icon("fa-download"), " Download as JSON"], () =>
        downloadJson(`${this.selection.name}.json`, annSongIds.map(toAnisongDbSong)),
      ),
    ];
  }

  buildHistoryPanel() {
    const games = songHistoryGames();
    if (!games.length) return [el("p", { className: "cqiEmpty" }, "Your song history is empty. Play a game first.")];

    this.history = { games: new Set(), results: new Set(HISTORY_RESULTS.map(({ key }) => key)) };
    const resultToggles = HISTORY_RESULTS.map(({ key, label }) =>
      toggleButton(label, true, (event) => {
        event.currentTarget.classList.toggle("on");
        this.history.results.has(key) ? this.history.results.delete(key) : this.history.results.add(key);
        this.applyHistorySelection();
      }),
    );
    return [
      el(
        "div",
        { className: "cqiHistoryList" },
        games.map((game) => {
          const count = el("span", { className: "cqiMuted" }, game.loaded ? plural(game.rows().length, "song") : "");
          return el(
            "label",
            { className: "cqiCheckbox cqiHistoryGame" },
            el("input", {
              type: "checkbox",
              onchange: (event) => this.toggleHistoryGame(game, event.target.checked, count),
            }),
            el("span", { className: "cqiHistoryRoom" }, game.room),
            el("span", { className: "cqiMuted" }, game.date),
            count,
          );
        }),
      ),
      el(
        "div",
        { className: "cqiField" },
        el("span", {}, "Your result", infoIcon(HELP.historyResults)),
        el("div", { className: "cqiToggleGroup" }, resultToggles),
      ),
    ];
  }

  async toggleHistoryGame(game, selected, count) {
    if (!selected) {
      this.history.games.delete(game);
      return this.applyHistorySelection();
    }
    this.history.games.add(game);
    this.pending++;
    this.update();
    try {
      await game.load();
      setChildren(count, plural(game.rows().length, "song"));
    } catch {
      this.history.games.delete(game);
      setChildren(count, el("span", { className: "cqiError" }, "AMQ did not send this game's songs"));
    }
    this.pending--;
    if (this.source === "history") this.applyHistorySelection();
  }

  applyHistorySelection() {
    const results = HISTORY_RESULTS.filter(({ key }) => this.history.results.has(key));
    const games = [...this.history.games];
    const rows = games.flatMap((game) => game.rows()).filter((row) => results.some(({ matches }) => matches(row)));
    const name = games.length === 1 ? `${games[0].room} ${games[0].date}` : "Song history";
    this.selection = {
      annSongIds: rows.map((row) => row.annSongId),
      annIds: [],
      name: name.slice(0, NAME_MAX_LENGTH),
    };
    this.update();
  }

  update() {
    this.renderOptions();
    this.renderSummary();
  }

  renderOptions() {
    if (this.selection.quizSave) return setChildren(this.optionsPanel);
    const { mode, songTypes } = this.options;
    const set = (changes) => {
      Object.assign(this.options, changes);
      this.update();
    };
    const typeToggles = Object.values(SONG_TYPES).map((type) =>
      toggleButton(type, songTypes[type], () => set({ songTypes: { ...songTypes, [type]: !songTypes[type] } })),
    );
    const flagToggle = (key, label) => toggleButton(label, this.options[key], () => set({ [key]: !this.options[key] }));

    setChildren(
      this.optionsPanel,
      el(
        "div",
        { className: "cqiField" },
        el("span", {}, "Import as"),
        el(
          "div",
          { className: "cqiToggleGroup" },
          toggleButton([icon("fa-music"), " Songs"], mode === "songs", () => set({ mode: "songs" })),
          toggleButton([icon("fa-film"), " Anime"], mode === "anime", () => set({ mode: "anime" })),
        ),
        el(
          "span",
          { className: "cqiMuted" },
          mode === "songs"
            ? "One song block per song: exactly these songs can play."
            : "One anime block per anime: AMQ picks one of its songs each time.",
        ),
      ),
      el(
        "div",
        { className: "cqiField" },
        el("span", {}, "Song types"),
        el("div", { className: "cqiToggleGroup" }, typeToggles),
      ),
      mode === "songs" &&
        el(
          "div",
          { className: "cqiField" },
          el("span", {}, "Also include", infoIcon(HELP.dubsAndRebroadcasts)),
          el(
            "div",
            { className: "cqiToggleGroup" },
            flagToggle("dubs", "Dubs"),
            flagToggle("rebroadcasts", "Rebroadcasts"),
          ),
        ),
      this.targets &&
        el(
          "label",
          { className: "cqiField" },
          el("span", {}, "Add to"),
          el(
            "select",
            {
              className: "cqiInput",
              onchange: (event) => (this.target = this.targets[event.target.selectedIndex].value),
            },
            this.targets.map(({ label, value }) => el("option", { selected: value === this.target }, label)),
          ),
        ),
    );
  }

  renderSummary() {
    const { error, quizSave } = this.selection;
    let message;
    let canImport = false;

    if (this.loadError) {
      message = el("span", { className: "cqiError" }, this.loadError);
    } else if (!this.ready) {
      message = [icon("fa-spinner fa-spin"), " Loading the AMQ song list…"];
    } else if (this.pending) {
      message = [icon("fa-spinner fa-spin"), " Loading songs from your history…"];
    } else if (error) {
      message = el("span", { className: "cqiError" }, error);
    } else if (quizSave) {
      const songs = quizSave.ruleBlocks.reduce((total, block) => total + block.blocks.length, 0);
      message = `Quiz "${quizSave.name}" with ${plural(quizSave.ruleBlocks.length, "rule block")} and ${plural(songs, "block")}.`;
      canImport = true;
    } else {
      this.entries = buildEntries(this.selection, this.options);
      const missing = countMissing(this.selection);
      const kind = this.options.mode === "anime" ? "anime block" : "song block";
      const { entries } = limits();
      message = [
        this.entries.length ? `Creates ${plural(this.entries.length, kind)}.` : "Nothing to import yet.",
        missing > 0 && el("span", { className: "cqiWarning" }, ` ${plural(missing, "ID")} not found in AMQ.`),
        this.entries.length > entries &&
          el("span", { className: "cqiWarning" }, ` AMQ allows ${entries} per quiz, trim them in the editor.`),
      ];
      canImport = this.entries.length > 0;
    }

    setChildren(this.summary, message);
    this.confirmButton.disabled = !canImport;
  }

  confirm() {
    const { quizSave, name } = this.selection;
    this.close();
    this.onImport({ entries: quizSave ? [] : this.entries, quizSave, name, target: this.target });
  }
}

class SettingsDrawer {
  constructor({ title, fields, targets, onApply, onClose }) {
    this.targets = targets;
    this.onApply = onApply;
    this.error = el("div", { className: "cqiError" });
    this.rows = fields
      .map((field) => ({ field, targets: targets.filter(field.appliesTo) }))
      .filter((row) => row.targets.length)
      .map((row) => this.buildRow(row));

    this.element = el(
      "aside",
      { className: "cqiDrawer" },
      el(
        "div",
        { className: "cqiDrawerHeader" },
        el("h3", {}, title, this.rows.some((row) => row.hasModes) && infoIcon(HELP.settingModes)),
        button(icon("fa-times"), onClose, { className: "cqiIconButton", title: "Close" }),
      ),
      el(
        "div",
        { className: "cqiDrawerBody" },
        this.rows.map((row) => row.element),
      ),
      el(
        "div",
        { className: "cqiDrawerFooter" },
        this.error,
        button("Cancel", onClose),
        button("Apply", () => this.apply(), { className: "cqiPrimary" }),
      ),
    );
  }

  buildRow({ field, targets }) {
    const single = this.targets.length === 1;
    const input = field.input(targets[0]);
    const modes = [
      !single && ["keep", "Keep"],
      field.clearable && ["clear", "Block default"],
      ["set", field.clearable ? "Custom" : "Set"],
    ].filter(Boolean);
    const initialMode = single ? (field.clearable && !field.isSet(targets[0]) ? "clear" : "set") : "keep";
    const row = { field, targets, input, mode: initialMode, hasModes: modes.length > 1 };

    const modeButtons = modes.map(([mode, label]) => toggleButton(label, mode === initialMode, () => setMode(mode)));
    const inputWrapper = el("div", { className: "cqiDrawerInput" }, input.element);
    const setMode = (mode) => {
      row.mode = mode;
      modeButtons.forEach((modeButton, index) => modeButton.classList.toggle("on", modes[index][0] === mode));
      inputWrapper.classList.toggle("disabled", mode !== "set");
    };
    setMode(initialMode);

    const count =
      targets.length < this.targets.length
        ? el("span", { className: "cqiMuted" }, ` (${targets.length} of ${this.targets.length})`)
        : null;
    row.element = el(
      "div",
      { className: "cqiDrawerRow" },
      el("div", { className: "cqiDrawerLabel" }, field.label, HELP[field.key] && infoIcon(HELP[field.key]), count),
      modes.length > 1 && el("div", { className: "cqiToggleGroup cqiModes" }, modeButtons),
      inputWrapper,
    );
    return row;
  }

  apply() {
    try {
      const changes = this.rows
        .filter((row) => row.mode !== "keep")
        .map((row) => ({ ...row, value: row.mode === "set" ? row.input.read() : undefined }));
      this.onApply(() =>
        changes.forEach(({ field, targets, mode, value }) =>
          targets.forEach((target) => (mode === "clear" ? field.clear(target) : field.set(target, value))),
        ),
      );
    } catch (error) {
      this.error.textContent = error.message;
    }
  }
}

class SimulationDialog extends Overlay {
  constructor(draft) {
    super("cqiSimulation");
    this.draft = draft;
    this.tableBody = el("tbody");
    this.summary = el("div", { className: "cqiSummary" });

    this.window.append(
      el(
        "div",
        { className: "cqiHeader" },
        el("h2", {}, "Quiz simulation", infoIcon(HELP.simulation)),
        el("div", { className: "cqiSpacer" }),
        button([icon("fa-refresh"), " Reroll"], () => this.reroll(), { className: "cqiPrimary", title: "Reroll (R)" }),
        button(icon("fa-times"), () => this.close(), { className: "cqiIconButton", title: "Close" }),
      ),
      el(
        "div",
        { className: "cqiTableWrapper" },
        el(
          "table",
          { className: "cqiTable" },
          el(
            "thead",
            {},
            el(
              "tr",
              {},
              el("th", { className: "cqiLinkCell" }),
              el("th", {}, "#"),
              el("th", {}, "Type"),
              el("th", {}, "Anime"),
              el("th", {}, "Song"),
              el("th", {}, "Artist"),
            ),
          ),
          this.tableBody,
        ),
      ),
      el(
        "div",
        { className: "cqiFooter" },
        this.summary,
        button("Close", () => this.close()),
      ),
    );
    this.root.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.close();
      if (event.key.toLowerCase() === "r" && !event.ctrlKey && !event.metaKey) this.reroll();
    });
    this.reroll();
  }

  reroll() {
    let songNumber = 0;
    const run = simulateQuiz(this.draft);
    const rows = run.flatMap(({ number, block, groups, played }) => [
      el(
        "tr",
        { className: "cqiSimulationBlock" },
        el(
          "td",
          { colSpan: 6 },
          `Rule block ${number}`,
          el("span", { className: "cqiChips" }, ruleSettingChips(block.settings)),
          played < block.settings.songCount &&
            el(
              "span",
              { className: "cqiWarning" },
              ` Only ${plural(played, "song")} of ${block.settings.songCount} could be picked.`,
            ),
        ),
      ),
      groups.flatMap((picks) =>
        picks.map((pick, index) =>
          simulationRow(pick, pick.counts ? ++songNumber : "", index > 0, index < picks.length - 1),
        ),
      ),
    ]);
    setChildren(this.tableBody, rows);
    setChildren(this.summary, `${plural(songNumber, "song")} played out of ${this.draft.songCount} planned.`);
  }
}

function simulationRow({ entry, info }, number, linkedAbove, linkedBelow) {
  const cells = {
    algorithm: [el("span", { className: "cqiMuted" }, "Song chosen by the algorithm block"), "", ""],
    message: [
      info.animeName,
      entry.save.avatar ? el("span", { className: "cqiMuted" }, avatarName(entry.save.avatar)) : "",
      "",
    ],
    title: [info.animeName, "", ""],
  }[entry.kind] ?? [info.animeName, info.songName, info.artist];
  return el(
    "tr",
    { className: entry.playable ? "" : "cqiSimulationExtra" },
    linkCell(linkedAbove, linkedBelow),
    el("td", { className: "cqiMuted" }, number),
    el("td", {}, el("span", { className: `cqiBadge cqiType${info.type}` }, info.typeLabel)),
    cells.map((cell) => el("td", {}, cell)),
  );
}

const QUERY_HELP = [
  ["words", "Anime, song or artist name"],
  ["type:op|ed|in", "Song type, also anime, algo, msg, title"],
  ["type:op1-10", "Numbered, also op1, ed>=3, several with commas: op1-2,op4-5"],
  ['anime:"name"', "Any anime name (English, romaji, alt)"],
  ["song:  artist:", "Song name, artist incl. group members"],
  ["composer:  arranger:", "Composer or arranger"],
  ["year:2010-2015", "Also year:2018, year:>=2018"],
  ["season:spring", "Winter, spring, summer, fall"],
  ["animetype:movie", "TV, movie, OVA, ONA, special…"],
  ["category:character", "Standard, character, chanting, instrumental"],
  ["difficulty:20-60", "Only for AnisongDB imports"],
  ["block:2", "Rule block number"],
  ["id:12345", "annSongId or annId"],
  ["is:watched", "unwatched, liked, disliked, unrated, dub, rebroadcast, locked, linked, override, missing"],
  ['"exact phrase"', 'Quotes keep words together, e.g. -"love live"'],
  ["-term", "Exclude, e.g. -type:in"],
  ["a|b  a,b", "Either, e.g. season:spring|fall"],
];

class QuizEditor extends Overlay {
  constructor(draft, { confirmLabel, onConfirm }) {
    super("cqiEditor");
    this.draft = draft;
    this.onConfirm = onConfirm;
    this.currentBlock = draft.blocks[0];
    this.selection = new Set();
    this.query = "";
    this.typeChips = new Set();
    this.history = [];
    this.future = [];
    this.cursorId = null;
    this.lastClickedId = null;
    this.drawer = null;
    this.rows = [];

    this.nameInput = el("input", {
      type: "text",
      className: "cqiInput cqiNameInput",
      maxLength: NAME_MAX_LENGTH,
      placeholder: "Quiz name",
      value: draft.name,
      oninput: () => (this.draft.name = this.nameInput.value),
    });
    this.undoButton = button([icon("fa-undo"), " Undo"], () => this.undo(), { title: "Undo (Ctrl+Z)" });
    this.redoButton = button([icon("fa-repeat"), " Redo"], () => this.redo(), { title: "Redo (Ctrl+Y)" });
    this.blockList = el("div", { className: "cqiBlockList" });
    this.blockBar = el("div", { className: "cqiBlockBar" });
    this.chipBar = el("div", { className: "cqiToggleGroup" });
    this.selectionBar = el("div", { className: "cqiSelectionBar" });
    this.tableBody = el("tbody");
    this.tableHead = el("thead");
    this.tableWrapper = el(
      "div",
      { className: "cqiTableWrapper" },
      el("table", { className: "cqiTable" }, this.tableHead, this.tableBody),
    );
    this.dragging = false;
    this.dragPointerY = null;
    this.status = el("div", { className: "cqiStatus" });
    this.toast = el("div", { className: "cqiToast" });
    this.queryInput = el("input", {
      type: "text",
      className: "cqiInput cqiQuery",
      placeholder: 'Filter… e.g.  type:op year:2010-2015 artist:"Suzuko Mimori"',
      oninput: () => {
        this.query = this.queryInput.value;
        this.renderTable();
      },
    });
    this.main = el(
      "main",
      { className: "cqiMain" },
      this.blockBar,
      el(
        "div",
        { className: "cqiFilterBar" },
        this.queryInput,
        button(icon("fa-question"), (event) => this.showQueryHelp(event.currentTarget), {
          className: "cqiIconButton",
          title: "Filter syntax",
        }),
        this.chipBar,
      ),
      this.selectionBar,
      this.tableWrapper,
    );
    this.body = el(
      "div",
      { className: "cqiEditorBody" },
      el(
        "aside",
        { className: "cqiSidebar" },
        el(
          "div",
          { className: "cqiSidebarHeader" },
          el("h3", {}, "Rule blocks"),
          button(icon("fa-plus"), () => this.addBlock(), { className: "cqiIconButton", title: "New rule block" }),
        ),
        this.blockList,
        el(
          "label",
          { className: "cqiCheckbox" },
          el("input", {
            type: "checkbox",
            checked: draft.randomOrder,
            onchange: (event) => (this.draft.randomOrder = event.target.checked),
          }),
          "Play rule blocks in random order",
          infoIcon(HELP.ruleBlockRandomOrder),
        ),
      ),
      this.main,
    );

    this.window.append(
      el(
        "div",
        { className: "cqiHeader" },
        el("h2", {}, "Quiz Editor"),
        this.nameInput,
        el("div", { className: "cqiSpacer" }),
        this.undoButton,
        this.redoButton,
        button(icon("fa-keyboard-o"), (event) => this.showShortcuts(event.currentTarget), {
          className: "cqiIconButton",
          title: "Keyboard shortcuts",
        }),
        button([icon("fa-plus"), " Add songs"], () => this.openImport()),
        button([icon("fa-play-circle"), " Simulate"], () => new SimulationDialog(this.draft).show(), {
          title: "Preview a possible run of the quiz",
        }),
        button(
          [icon("fa-download"), " Export"],
          () => downloadJson(`${this.draft.name || "quiz"}.json`, this.draft.toSave()),
          { title: "Save this quiz as a file you can import later" },
        ),
        button("Cancel", () => this.cancel()),
        button(confirmLabel, () => this.confirm(), { className: "cqiPrimary" }),
      ),
      this.body,
      el("div", { className: "cqiFooter" }, this.status, this.toast),
    );

    this.tableBody.addEventListener("click", (event) => this.handleRowClick(event));
    this.tableBody.addEventListener("dblclick", (event) => this.handleRowDoubleClick(event));
    this.tableBody.addEventListener("dragstart", (event) => this.handleRowDragStart(event));
    this.tableBody.addEventListener("dragover", (event) => this.handleRowDragOver(event));
    this.tableBody.addEventListener("dragleave", () => this.clearDropMarker());
    this.tableBody.addEventListener("drop", (event) => this.handleRowDrop(event));
    this.tableBody.addEventListener("dragend", () => this.endRowDrag());
    this.root.addEventListener("dragover", (event) => (this.dragPointerY = event.clientY));
    this.root.addEventListener("keydown", (event) => this.handleKey(event));
    this.render();
  }

  get blockNumbers() {
    return new Map(this.draft.blocks.map((block, index) => [block, index + 1]));
  }

  visibleRows() {
    const matches = compileQuery(this.query);
    const numbers = this.blockNumbers;
    const blocks = this.currentBlock ? [this.currentBlock] : this.draft.blocks;
    return blocks.flatMap((block) =>
      block.entries
        .map((entry, index) => ({
          entry,
          block,
          info: entry.info,
          blockNumber: numbers.get(block),
          position: index + 1,
          linkedBelow: Boolean(block.entries[index + 1]?.save.connectUp),
        }))
        .filter((row) => (!this.typeChips.size || this.typeChips.has(row.info.type)) && matches(row)),
    );
  }

  selectedEntries() {
    return this.draft.blocks.flatMap((block) => block.entries.filter((entry) => this.selection.has(entry.id)));
  }

  commit(description, mutate) {
    this.history.push(this.snapshot());
    this.future = [];
    this.preservingLinks(mutate);
    this.render();
    this.notify(description);
  }

  // A link joins a block to the one right above it, so it only survives while that neighbour stays the same.
  preservingLinks(mutate) {
    const previous = new Map();
    const eachWithPrevious = (callback) =>
      this.draft.blocks.forEach((block) =>
        block.entries.forEach((entry, index) => callback(entry, block.entries[index - 1])),
      );
    eachWithPrevious((entry, above) => previous.set(entry, above));
    mutate();
    eachWithPrevious((entry, above) => {
      if (!above || (previous.has(entry) && above !== previous.get(entry))) entry.save.connectUp = false;
    });
  }

  snapshot() {
    return { save: this.draft.toSave(), blockIndex: this.draft.blocks.indexOf(this.currentBlock) };
  }

  restore(snapshot) {
    const name = this.draft.name;
    this.draft = new QuizDraft(snapshot.save);
    this.draft.name = name;
    this.currentBlock = this.draft.blocks[snapshot.blockIndex] ?? null;
    this.selection.clear();
    this.closeDrawer();
    this.render();
  }

  undo() {
    const snapshot = this.history.pop();
    if (!snapshot) return;
    this.future.push(this.snapshot());
    this.restore(snapshot);
    this.notify("Undone");
  }

  redo() {
    const snapshot = this.future.pop();
    if (!snapshot) return;
    this.history.push(this.snapshot());
    this.restore(snapshot);
    this.notify("Redone");
  }

  notify(message) {
    this.toast.textContent = message;
    this.toast.classList.remove("show");
    // Forces a reflow so the fade animation restarts for back-to-back messages.
    void this.toast.offsetWidth;
    this.toast.classList.add("show");
  }

  render() {
    this.undoButton.disabled = !this.history.length;
    this.redoButton.disabled = !this.future.length;
    this.renderBlockList();
    this.renderBlockBar();
    this.renderChips();
    this.renderTable();
    this.renderStatus();
  }

  renderBlockList() {
    const allCard = el(
      "div",
      { className: `cqiBlockCard${this.currentBlock ? "" : " on"}`, onclick: () => this.showBlock(null) },
      el("div", { className: "cqiBlockTitle" }, "All rule blocks"),
      el("div", { className: "cqiMuted" }, `${plural(this.draft.entryCount, "block")} · plays ${this.draft.songCount}`),
    );
    const cards = this.draft.blocks.map((block, index) => {
      const card = el(
        "div",
        { className: `cqiBlockCard${block === this.currentBlock ? " on" : ""}`, onclick: () => this.showBlock(block) },
        el(
          "div",
          { className: "cqiBlockTitle" },
          `Rule block ${index + 1}`,
          el(
            "span",
            { className: "cqiBlockActions" },
            button(icon("fa-chevron-up"), (event) => (event.stopPropagation(), this.moveBlock(block, -1)), {
              className: "cqiIconButton",
              title: "Move up",
              disabled: index === 0,
            }),
            button(icon("fa-chevron-down"), (event) => (event.stopPropagation(), this.moveBlock(block, 1)), {
              className: "cqiIconButton",
              title: "Move down",
              disabled: index === this.draft.blocks.length - 1,
            }),
            button(icon("fa-trash"), (event) => (event.stopPropagation(), this.deleteBlock(block)), {
              className: "cqiIconButton",
              title: "Delete rule block",
            }),
          ),
        ),
        el(
          "div",
          { className: "cqiMuted" },
          `${plural(block.entries.length, "block")} · plays ${block.settings.songCount}`,
        ),
        el("div", { className: "cqiChips" }, ruleSettingChips(block.settings)),
      );
      card.addEventListener("dragover", (event) => (event.preventDefault(), card.classList.add("dropTarget")));
      card.addEventListener("dragleave", () => card.classList.remove("dropTarget"));
      card.addEventListener("drop", (event) => {
        event.preventDefault();
        this.moveSelection(block);
      });
      return card;
    });
    setChildren(this.blockList, allCard, cards);
  }

  renderBlockBar() {
    const block = this.currentBlock;
    const sortButton = button([icon("fa-sort-amount-asc"), " Sort"], (event) => this.showSortMenu(event.currentTarget));
    const addButton = button([icon("fa-plus"), " Add block"], (event) => this.showAddBlockMenu(event.currentTarget), {
      title: "Adds after the last selected block, or at the end",
    });
    if (!block) {
      setChildren(
        this.blockBar,
        el("h3", {}, "All rule blocks"),
        el("div", { className: "cqiSpacer" }),
        addButton,
        sortButton,
        button([icon("fa-sliders"), " Settings of every block"], () => this.editBlocks(this.draft.blocks)),
      );
      return;
    }
    const number = this.draft.blocks.indexOf(block) + 1;
    setChildren(
      this.blockBar,
      el("h3", {}, `Rule block ${number}`),
      el("div", { className: "cqiChips" }, ruleSettingChips(block.settings, true)),
      el("div", { className: "cqiSpacer" }),
      button(
        [icon("fa-check-square-o"), " Play every block"],
        () =>
          this.commit("Every block in this rule block now plays once", () =>
            block.fitSongCount(this.availableSongs(block)),
          ),
        { title: HELP.fitSongsPlayed },
      ),
      addButton,
      sortButton,
      button([icon("fa-sliders"), " Block settings"], () => this.editBlocks([block])),
    );
  }

  renderChips() {
    const chips = ["OP", "ED", "IN", "ANIME"].map((type) =>
      toggleButton(
        type === "ANIME" ? "Anime" : type,
        this.typeChips.has(type),
        () => {
          this.typeChips.has(type) ? this.typeChips.delete(type) : this.typeChips.add(type);
          this.renderChips();
          this.renderTable();
        },
        `cqiToggle cqiType${type}`,
      ),
    );
    setChildren(this.chipBar, chips);
  }

  renderTable() {
    this.rows = this.visibleRows();
    const showBlock = !this.currentBlock;
    this.headerCheckbox = el("input", {
      type: "checkbox",
      title: "Select every shown block",
      onchange: (event) => this.selectShown(event.target.checked),
    });

    setChildren(
      this.tableHead,
      el(
        "tr",
        {},
        el("th", { className: "cqiCheckColumn" }, this.headerCheckbox),
        el("th", { className: "cqiLinkCell", title: "Links" }),
        el("th", {}, "#"),
        el("th", {}, "Type"),
        el("th", {}, "Anime"),
        el("th", {}, "Song"),
        el("th", {}, "Artist"),
        el("th", {}, "Vintage"),
        el("th", {}, "Settings"),
        showBlock && el("th", {}, "Rule block"),
      ),
    );

    setChildren(
      this.tableBody,
      this.rows.slice(0, RENDERED_ROW_LIMIT).map(({ entry, info, position, blockNumber, linkedBelow }) =>
        el(
          "tr",
          { className: info.missing ? "missing" : "", draggable: true, dataset: { id: entry.id } },
          el("td", { className: "cqiCheckColumn" }, el("input", { type: "checkbox", tabIndex: -1 })),
          linkCell(Boolean(entry.save.connectUp), linkedBelow),
          el("td", { className: "cqiMuted" }, position),
          el("td", {}, el("span", { className: `cqiBadge cqiType${info.type}` }, info.typeLabel)),
          el(
            "td",
            { title: info.animeNames.join("\n") },
            info.animeName,
            info.animeType && el("span", { className: "cqiMuted" }, ` ${info.animeType}`),
          ),
          el("td", {}, entry.kind === "anime" ? animeEntrySummary(entry, info) : info.songName),
          el("td", { title: info.artistNames.join(", ") }, info.artist),
          el("td", { className: "cqiNoWrap" }, info.vintage),
          el(
            "td",
            {},
            el(
              "div",
              { className: "cqiChips" },
              entrySettingChips(entry, (algorithmEntry) => this.openAlgorithmSettings(algorithmEntry)),
            ),
          ),
          showBlock && el("td", { className: "cqiMuted" }, `#${blockNumber}`),
        ),
      ),
    );

    const hiddenRows = this.rows.length - RENDERED_ROW_LIMIT;
    if (!this.rows.length || hiddenRows > 0) {
      const message = !this.rows.length
        ? this.currentBlock?.entries.length === 0
          ? "This rule block is empty. Add songs, or move blocks here."
          : "Nothing matches this filter."
        : `${plural(hiddenRows, "more block")} not displayed. Selection actions still apply to every match; filter to see them.`;
      this.tableBody.append(el("tr", {}, el("td", { colSpan: 10, className: "cqiEmpty" }, message)));
    }
    this.refreshSelection();
  }

  refreshSelection() {
    this.tableBody.querySelectorAll("tr[data-id]").forEach((row) => {
      const selected = this.selection.has(Number(row.dataset.id));
      row.classList.toggle("selected", selected);
      row.querySelector("input").checked = selected;
    });
    this.headerCheckbox.checked = this.rows.length > 0 && this.rows.every(({ entry }) => this.selection.has(entry.id));
    this.renderSelectionBar();
  }

  renderSelectionBar() {
    this.keepFocus();
    const selected = this.selection.size;
    const hiddenSelected = selected - this.rows.filter(({ entry }) => this.selection.has(entry.id)).length;
    const disabled = selected === 0;
    setChildren(
      this.selectionBar,
      el(
        "span",
        { className: "cqiSelectionCount" },
        `${selected} selected`,
        hiddenSelected > 0 && el("span", { className: "cqiMuted" }, ` (${hiddenSelected} hidden by the filter)`),
        el("span", { className: "cqiMuted" }, ` · ${plural(this.rows.length, "block")} shown`),
      ),
      button("Select shown", () => this.selectShown(true), { disabled: !this.rows.length }),
      button("Invert", () => this.invertShown(), { disabled: !this.rows.length }),
      button("Clear", () => this.clearSelection(), { disabled }),
      el("div", { className: "cqiSpacer" }),
      button(icon("fa-arrow-up"), () => this.shiftSelection(-1), { disabled, title: "Move up (Alt+↑)" }),
      button(icon("fa-arrow-down"), () => this.shiftSelection(1), { disabled, title: "Move down (Alt+↓)" }),
      button(
        [icon("fa-share"), " Move to"],
        (event) =>
          this.showBlockMenu(event.currentTarget, (block) => this.moveSelection(block), [
            { label: [icon("fa-angle-double-up"), " Top of its rule block"], action: () => this.pinSelection(true) },
            {
              label: [icon("fa-angle-double-down"), " Bottom of its rule block"],
              action: () => this.pinSelection(false),
            },
            { separator: true },
          ]),
        { disabled },
      ),
      button(
        [icon("fa-clone"), " Copy to"],
        (event) => this.showBlockMenu(event.currentTarget, (block) => this.copySelection(block)),
        { disabled },
      ),
      button([icon("fa-pencil"), " Edit"], () => this.editEntries(), { disabled }),
      button([icon("fa-trash"), " Remove"], () => this.removeSelection(), { disabled, className: "cqiDanger" }),
    );
  }

  // Re-rendering removes the focused button, which would send focus outside and silence the shortcuts.
  keepFocus() {
    if (this.selectionBar.contains(document.activeElement) || !this.root.contains(document.activeElement)) {
      queueMicrotask(() => this.root.isConnected && !document.querySelector(".modal.in") && this.root.focus());
    }
  }

  renderStatus() {
    const { ruleBlocks, songs, entries } = limits();
    const stat = (label, value, max) =>
      el("span", { className: value > max ? "cqiError" : "" }, `${label} ${value}/${max}`);
    setChildren(
      this.status,
      stat("Songs played", this.draft.songCount, songs),
      stat("Rule blocks", this.draft.blocks.length, ruleBlocks),
      stat("Blocks", this.draft.entryCount, entries),
    );
  }

  handleRowClick(event) {
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    const id = Number(row.dataset.id);
    if (event.shiftKey && this.lastClickedId !== null) {
      const ids = this.rows.map(({ entry }) => entry.id);
      const [from, to] = [ids.indexOf(this.lastClickedId), ids.indexOf(id)].sort((a, b) => a - b);
      if (from >= 0) ids.slice(from, to + 1).forEach((rangeId) => this.selection.add(rangeId));
    } else {
      this.selection.has(id) ? this.selection.delete(id) : this.selection.add(id);
      this.lastClickedId = id;
    }
    this.cursorId = id;
    this.refreshSelection();
  }

  handleRowDoubleClick(event) {
    const id = Number(event.target.closest("tr[data-id]")?.dataset.id);
    if (!id) return;
    this.selection = new Set([id]);
    this.refreshSelection();
    this.editSelection();
  }

  handleRowDragStart(event) {
    const id = Number(event.target.closest("tr[data-id]")?.dataset.id);
    if (!this.selection.has(id)) {
      this.selection = new Set([id]);
      this.refreshSelection();
    }
    this.startAutoScroll();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", plural(this.selection.size, "block"));
  }

  handleRowDragOver(event) {
    const row = event.target.closest("tr[data-id]");
    if (!row || this.selection.has(Number(row.dataset.id))) return;
    event.preventDefault();
    const { top, height } = row.getBoundingClientRect();
    const after = event.clientY > top + height / 2;
    if (row.classList.contains(after ? "dropAfter" : "dropBefore")) return;
    this.clearDropMarker();
    row.classList.add(after ? "dropAfter" : "dropBefore");
  }

  handleRowDrop(event) {
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    event.preventDefault();
    const after = row.classList.contains("dropAfter");
    this.clearDropMarker();
    this.moveSelectionNextTo(this.entryById(Number(row.dataset.id)), after);
  }

  startAutoScroll() {
    this.dragging = true;
    this.dragPointerY = null;
    const speed = (depth) => (clamp(depth, 0, AUTO_SCROLL_EDGE) / AUTO_SCROLL_EDGE) * AUTO_SCROLL_MAX_SPEED;
    const scroll = () => {
      if (!this.dragging) return;
      const { top, bottom } = this.tableWrapper.getBoundingClientRect();
      const y = this.dragPointerY;
      if (y !== null && y < top + AUTO_SCROLL_EDGE) this.tableWrapper.scrollTop -= speed(top + AUTO_SCROLL_EDGE - y);
      if (y !== null && y > bottom - AUTO_SCROLL_EDGE)
        this.tableWrapper.scrollTop += speed(y - bottom + AUTO_SCROLL_EDGE);
      requestAnimationFrame(scroll);
    };
    requestAnimationFrame(scroll);
  }

  endRowDrag() {
    this.dragging = false;
    this.clearDropMarker();
  }

  clearDropMarker() {
    this.tableBody
      .querySelectorAll(".dropBefore, .dropAfter")
      .forEach((row) => row.classList.remove("dropBefore", "dropAfter"));
  }

  get shortcuts() {
    return [
      { keys: ["Ctrl+Z"], label: "Undo", run: () => this.undo() },
      { keys: ["Ctrl+Y", "Ctrl+Shift+Z"], label: "Redo", run: () => this.redo() },
      { keys: ["Ctrl+A"], label: "Select every shown block", run: () => this.selectShown(true) },
      { keys: ["Escape"], label: "Close a menu or the edit panel, then clear the selection", run: () => this.escape() },
      { keys: ["ArrowUp", "ArrowDown"], label: "Select the block above or below", run: (key) => this.moveCursor(key) },
      {
        keys: ["Shift+ArrowUp", "Shift+ArrowDown"],
        label: "Extend the selection",
        run: (key) => this.moveCursor(key, true),
      },
      { keys: ["Ctrl+C"], label: "Copy", run: () => this.copyToClipboard() },
      { keys: ["Ctrl+X"], label: "Cut", run: () => this.cutToClipboard() },
      { keys: ["Ctrl+V"], label: "Paste after the selection", run: () => this.pasteClipboard() },
      { keys: ["Ctrl+D"], label: "Duplicate", run: () => this.duplicateSelection() },
      { keys: ["Delete", "Backspace"], label: "Remove", run: () => this.selection.size && this.removeSelection() },
      {
        keys: ["Alt+ArrowUp", "Alt+ArrowDown"],
        label: "Move up or down",
        run: (key) => this.shiftSelection(key.endsWith("Up") ? -1 : 1),
      },
      {
        keys: ["Alt+Home", "Alt+End"],
        label: "Move to the top or bottom",
        run: (key) => this.selection.size && this.pinSelection(key.endsWith("Home")),
      },
      { keys: ["Enter", "F2"], label: "Edit the selection", run: () => this.editSelection() },
      { keys: ["Ctrl+F"], label: "Filter", run: () => this.queryInput.focus() },
      { keys: ["Ctrl+S"], label: "Create or apply the quiz", run: () => this.confirm() },
    ];
  }

  handleKey(event) {
    const combo = keyCombo(event);
    if (combo === "Enter" && event.target.matches("button")) return;
    if (event.target.matches("input, textarea, select")) {
      if (combo === "Escape") this.root.focus();
      if (combo !== "Ctrl+S") return;
    }
    const shortcut = this.shortcuts.find(({ keys }) => keys.includes(combo));
    if (!shortcut) return;
    event.preventDefault();
    shortcut.run(combo);
  }

  showShortcuts(anchor) {
    openMenu(anchor, [
      {
        label: el(
          "table",
          { className: "cqiHelpTable" },
          this.shortcuts.map(({ keys, label }) =>
            el("tr", {}, el("td", {}, el("code", {}, keys.map(formatKeys).join(" / "))), el("td", {}, label)),
          ),
        ),
        action: () => this.root.focus(),
      },
    ]);
  }

  escape() {
    if (activeMenu) return closeMenu();
    if (this.drawer) return this.closeDrawer();
    this.clearSelection();
  }

  moveCursor(key, extend = false) {
    const ids = this.rows.slice(0, RENDERED_ROW_LIMIT).map(({ entry }) => entry.id);
    if (!ids.length) return;
    const current = ids.indexOf(this.cursorId);
    const step = key.endsWith("Up") ? -1 : 1;
    const next = current === -1 ? (step > 0 ? 0 : ids.length - 1) : clamp(current + step, 0, ids.length - 1);
    this.cursorId = ids[next];
    if (extend && ids.includes(this.lastClickedId)) {
      const [from, to] = [ids.indexOf(this.lastClickedId), next].sort((a, b) => a - b);
      this.selection = new Set(ids.slice(from, to + 1));
    } else {
      this.selection = new Set([this.cursorId]);
      this.lastClickedId = this.cursorId;
    }
    this.refreshSelection();
    this.tableBody.querySelector(`tr[data-id="${this.cursorId}"]`)?.scrollIntoView({ block: "nearest" });
  }

  editSelection() {
    const entries = this.selectedEntries();
    if (!entries.length) return;
    entries.length === 1 && entries[0].kind === "algorithm"
      ? this.openAlgorithmSettings(entries[0])
      : this.editEntries();
  }

  // Copies keep a link only when the linked neighbour is copied along with the block.
  selectionSaves() {
    const entries = this.selectedEntries();
    return entries.map((entry, index) => ({
      ...structuredClone(entry.save),
      connectUp: Boolean(entry.save.connectUp) && this.neighbour(entry, -1) === entries[index - 1],
    }));
  }

  copyToClipboard() {
    if (!this.selection.size) return false;
    clipboard = this.selectionSaves();
    this.notify(`Copied ${plural(clipboard.length, "block")}`);
    return true;
  }

  cutToClipboard() {
    if (this.copyToClipboard()) this.removeSelection();
  }

  pasteClipboard() {
    this.insertSaves(clipboard, "Pasted");
  }

  duplicateSelection() {
    if (this.selection.size) this.insertSaves(this.selectionSaves(), "Duplicated");
  }

  insertSaves(saves, verb) {
    if (!saves.length) return this.notify("Nothing to paste yet. Copy blocks with Ctrl+C first.");
    const entries = saves.map((save) => new Entry(structuredClone(save)));
    const overLimit = SPECIAL_KINDS.find(
      (kind) => this.draft.countOf(kind) + entries.filter((entry) => entry.kind === kind).length > limits()[kind],
    );
    if (overLimit) return this.notify(`A quiz can hold at most ${limits()[overLimit]} ${overLimit} blocks.`);
    const { block, index } = this.insertionPoint();
    this.commit(`${verb} ${plural(entries.length, "block")}`, () =>
      this.keepingFit([block], () => block.entries.splice(index, 0, ...entries)),
    );
    this.selection = new Set(entries.map((entry) => entry.id));
    this.refreshSelection();
  }

  showBlock(block) {
    this.currentBlock = block;
    this.closeDrawer();
    this.render();
  }

  selectShown(select) {
    this.rows.forEach(({ entry }) => (select ? this.selection.add(entry.id) : this.selection.delete(entry.id)));
    this.refreshSelection();
  }

  invertShown() {
    this.rows.forEach(({ entry }) =>
      this.selection.has(entry.id) ? this.selection.delete(entry.id) : this.selection.add(entry.id),
    );
    this.refreshSelection();
  }

  clearSelection() {
    this.selection.clear();
    this.refreshSelection();
  }

  showBlockMenu(anchor, action, extraItems = []) {
    const numbers = this.blockNumbers;
    openMenu(anchor, [
      ...extraItems,
      ...this.draft.blocks.map((block) => ({
        label: `Rule block ${numbers.get(block)} (${plural(block.entries.length, "block")})`,
        action: () => action(block),
      })),
      { separator: true },
      {
        label: [icon("fa-plus"), " New rule block"],
        action: () => action(null),
        disabled: this.draft.blocks.length >= limits().ruleBlocks,
      },
    ]);
  }

  showAddBlockMenu(anchor) {
    openMenu(anchor, [
      { label: [icon("fa-cogs"), " Algorithm block"], action: () => this.openAlgorithmSettings() },
      { label: [icon("fa-commenting"), " Message block"], action: () => this.insertEntry(Entry.message()) },
      { label: [icon("fa-header"), " Title block"], action: () => this.insertEntry(Entry.title()) },
    ]);
  }

  openAlgorithmSettings(entry) {
    hostModal.setModeQuizBuilder(entry?.save.settings);
    // AMQ's dialog hands its result to targetRuleBlock.updateSettings, so pointing it here reuses AMQ's own UI.
    hostModal.targetRuleBlock = {
      updateSettings: (settings) =>
        entry
          ? this.commit("Updated the algorithm block", () =>
              this.keepingFit(this.draft.blocks, () => (entry.save.settings = settings)),
            )
          : this.insertEntry(Entry.algorithm(settings)),
    };
    hostModal.show();
  }

  insertEntry(entry) {
    const max = limits()[entry.kind];
    if (this.draft.countOf(entry.kind) >= max)
      return this.notify(`A quiz can hold at most ${max} ${entry.kind} blocks.`);
    const { block, index } = this.insertionPoint();
    this.commit(`Added a new ${entry.kind} block`, () =>
      this.keepingFit([block], () => block.entries.splice(index, 0, entry)),
    );
    this.selection = new Set([entry.id]);
    this.refreshSelection();
    if (entry.kind !== "algorithm") this.editEntries();
  }

  insertionPoint() {
    const anchor = this.selectedEntries()
      .filter((entry) => !this.currentBlock || this.currentBlock.entries.includes(entry))
      .at(-1);
    const block =
      this.currentBlock ??
      this.draft.blocks.find((candidate) => candidate.entries.includes(anchor)) ??
      this.draft.blocks.at(-1);
    const index = anchor ? block.entries.indexOf(anchor) + 1 : block.entries.length;
    return { block, index };
  }

  showSortMenu(anchor) {
    const blocks = this.currentBlock ? [this.currentBlock] : this.draft.blocks;
    const sortBlocks = (label, order) =>
      this.commit(`Sorted by ${label.toLowerCase()}`, () =>
        blocks.forEach((block) => (block.entries = order(block.entries))),
      );
    openMenu(anchor, [
      ...SORTS.map((sort) => ({
        label: sort.label,
        action: () => sortBlocks(sort.label, (entries) => sortEntries(entries, sort)),
      })),
      { separator: true },
      { label: "Reverse", action: () => sortBlocks("Reverse order", (entries) => [...entries].reverse()) },
      { label: "Shuffle", action: () => sortBlocks("Random order", shuffle) },
    ]);
  }

  showQueryHelp(anchor) {
    openMenu(anchor, [
      {
        label: el(
          "table",
          { className: "cqiHelpTable" },
          QUERY_HELP.map(([syntax, description]) =>
            el("tr", {}, el("td", {}, el("code", {}, syntax)), el("td", {}, description)),
          ),
        ),
        action: () => this.queryInput.focus(),
      },
    ]);
  }

  resolveTarget(block) {
    if (block) return block;
    const created = new RuleBlock();
    created.settings.songCount = 0;
    this.draft.blocks.push(created);
    return created;
  }

  availableSongs(block) {
    return limits().songs - this.draft.songCount + block.settings.songCount;
  }

  moveSelection(target) {
    this.relocateSelection(() => {
      const block = this.resolveTarget(target);
      return { block, index: block.entries.length };
    });
  }

  moveSelectionNextTo(anchor, after) {
    if (this.selection.has(anchor.id)) return;
    this.relocateSelection(() => {
      const block = this.draft.blocks.find((candidate) => candidate.entries.includes(anchor));
      return { block, index: block.entries.indexOf(anchor) + (after ? 1 : 0) };
    });
  }

  relocateSelection(findPosition) {
    const entries = this.selectedEntries();
    if (!entries.length) return;
    this.commit(`Moved ${plural(entries.length, "block")}`, () => {
      const playCounts = new Map(this.draft.blocks.map((block) => [block, block.playCount]));
      const playingEverything = new Set(
        this.draft.blocks.filter((block) => block.settings.songCount >= block.playCount),
      );
      this.draft.blocks.forEach(
        (block) => (block.entries = block.entries.filter((entry) => !this.selection.has(entry.id))),
      );
      const { block, index } = findPosition();
      block.entries.splice(index, 0, ...entries);

      const changed = (candidate) => candidate.playCount - (playCounts.get(candidate) ?? 0);
      this.draft.blocks.filter((candidate) => changed(candidate) < 0).forEach((candidate) => candidate.capSongCount());
      this.draft.blocks
        .filter(
          (candidate) => changed(candidate) > 0 && (playingEverything.has(candidate) || !playCounts.has(candidate)),
        )
        .forEach((candidate) => candidate.fitSongCount(Math.max(1, this.availableSongs(candidate))));
    });
  }

  shiftSelection(offset) {
    if (!this.selection.size) return;
    this.commit(offset < 0 ? "Moved up" : "Moved down", () =>
      this.draft.blocks.forEach(
        (block) => (block.entries = shiftSelected(block.entries, (entry) => this.selection.has(entry.id), offset)),
      ),
    );
    this.tableBody.querySelector("tr.selected")?.scrollIntoView({ block: "nearest" });
  }

  pinSelection(toTop) {
    this.commit(toTop ? "Moved to the top" : "Moved to the bottom", () =>
      this.draft.blocks.forEach((block) => {
        const selected = block.entries.filter((entry) => this.selection.has(entry.id));
        const rest = block.entries.filter((entry) => !this.selection.has(entry.id));
        block.entries = toTop ? [...selected, ...rest] : [...rest, ...selected];
      }),
    );
  }

  copySelection(target) {
    const entries = this.selectedEntries();
    this.commit(`Copied ${plural(entries.length, "block")}`, () =>
      this.addEntries(
        target,
        entries.map((entry) => entry.clone()),
      ),
    );
  }

  removeSelection() {
    const count = this.selection.size;
    this.commit(`Removed ${plural(count, "block")}`, () => {
      this.detachSelection();
      this.selection.clear();
    });
  }

  detachSelection() {
    this.draft.blocks.forEach((block) => {
      block.entries = block.entries.filter((entry) => !this.selection.has(entry.id));
      block.capSongCount();
    });
  }

  neighbour(entry, offset) {
    const block = this.draft.blocks.find((candidate) => candidate.entries.includes(entry));
    return block.entries[block.entries.indexOf(entry) + offset] ?? null;
  }

  entryById(id) {
    return this.draft.blocks.flatMap((block) => block.entries).find((entry) => entry.id === id);
  }

  addEntries(target, entries) {
    const block = this.resolveTarget(target);
    this.keepingFit([block], () => block.entries.push(...entries));
    return block;
  }

  keepingFit(blocks, mutate) {
    const playingEverything = blocks.filter((block) => block.settings.songCount >= block.playCount);
    mutate();
    playingEverything.forEach((block) => block.fitSongCount(Math.max(1, this.availableSongs(block))));
  }

  addBlock() {
    if (this.draft.blocks.length >= limits().ruleBlocks)
      return this.notify(`A quiz can have at most ${limits().ruleBlocks} rule blocks.`);
    this.commit("Added a rule block", () => {
      this.currentBlock = new RuleBlock();
      this.currentBlock.settings.songCount = clamp(
        limits().songs - this.draft.songCount,
        1,
        DEFAULT_RULE_SETTINGS.songCount,
      );
      this.draft.blocks.push(this.currentBlock);
    });
  }

  moveBlock(block, offset) {
    this.commit("Moved the rule block", () => {
      const index = this.draft.blocks.indexOf(block);
      this.draft.blocks.splice(index, 1);
      this.draft.blocks.splice(index + offset, 0, block);
    });
  }

  deleteBlock(block) {
    if (this.draft.blocks.length === 1) return this.notify("A quiz needs at least one rule block.");
    this.commit(`Deleted a rule block with ${plural(block.entries.length, "block")}`, () => {
      this.draft.blocks = this.draft.blocks.filter((candidate) => candidate !== block);
      if (this.currentBlock === block) this.currentBlock = null;
    });
  }

  editEntries() {
    const entries = this.selectedEntries();
    this.openDrawer(
      new SettingsDrawer({
        title: `Edit ${plural(entries.length, "block")}`,
        fields: [
          ...ENTRY_FIELDS,
          linkField("connectUp", "Link to the block above", (entry) => (this.neighbour(entry, -1) ? entry : null)),
          linkField("connectDown", "Link to the block below", (entry) => this.neighbour(entry, 1)),
          LOCK_FIELD,
        ],
        targets: entries,
        onApply: (apply) =>
          this.commit(`Updated ${plural(entries.length, "block")}`, () => {
            this.keepingFit(this.draft.blocks, apply);
            this.closeDrawer();
          }),
        onClose: () => this.closeDrawer(),
      }),
    );
  }

  editBlocks(blocks) {
    const numbers = this.blockNumbers;
    this.openDrawer(
      new SettingsDrawer({
        title:
          blocks.length === 1
            ? `Rule block ${numbers.get(blocks[0])} settings`
            : `Settings of ${plural(blocks.length, "rule block")}`,
        fields: BLOCK_FIELDS,
        targets: blocks,
        onApply: (apply) => this.commit("Updated rule block settings", () => (apply(), this.closeDrawer())),
        onClose: () => this.closeDrawer(),
      }),
    );
  }

  openDrawer(drawer) {
    this.closeDrawer();
    this.drawer = drawer;
    this.body.append(drawer.element);
  }

  closeDrawer() {
    this.drawer?.element.remove();
    this.drawer = null;
  }

  openImport() {
    const numbers = this.blockNumbers;
    const targets = [
      ...(this.currentBlock
        ? [{ label: `Rule block ${numbers.get(this.currentBlock)}`, value: this.currentBlock }]
        : []),
      { label: "A new rule block", value: null },
      ...this.draft.blocks
        .filter((block) => block !== this.currentBlock)
        .map((block) => ({ label: `Rule block ${numbers.get(block)}`, value: block })),
    ];
    new ImportDialog({
      title: "Add songs",
      confirmLabel: "Add",
      targets,
      onImport: (result) => this.addImport(result),
    }).show();
  }

  addImport({ entries, quizSave, target }) {
    if (quizSave) {
      this.commit(`Added ${plural(quizSave.ruleBlocks.length, "rule block")}`, () =>
        this.draft.blocks.push(...quizSave.ruleBlocks.map((save) => RuleBlock.fromSave(save))),
      );
      return;
    }
    this.commit(
      `Added ${plural(entries.length, "block")}`,
      () => (this.currentBlock = this.addEntries(target, entries)),
    );
  }

  cancel() {
    if (!this.history.length) return this.close();
    messageDisplayer.displayOption(
      "Discard changes?",
      "Your edits in the Quiz Editor will be lost.",
      "Discard",
      "Keep editing",
      () => this.close(),
    );
  }

  async confirm() {
    const problems = this.draft.problems;
    if (problems.length) return messageDisplayer.displayMessage("The quiz is over AMQ's limits", problems.join("<br>"));
    if (!this.draft.name.trim())
      return messageDisplayer.displayMessage("Name your quiz", "Give the quiz a name before continuing.");
    if (await this.onConfirm(this.draft)) this.close();
  }
}

function ruleSettingChips(settings, detailed = false) {
  return [
    chip("fa-random", settings.randomOrder ? "Random" : "Sequential", detailed),
    chip("fa-clock-o", formatGuessTime(settings.guessTime), detailed && "Guess time"),
    chip("fa-crosshairs", formatRange(settings.samplePoint.samplePoint), detailed && "Sample point"),
    chip("fa-forward", formatSpeed(settings.playBackSpeed), detailed && "Playback speed"),
    !settings.duplicates && chip("fa-ban", "No duplicates", detailed),
    guessModeChip(settings.guessModes),
  ];
}

function entrySettingChips(entry, onAlgorithmSettings) {
  const { save } = entry;
  return [
    entry.kind === "algorithm" &&
      button([icon("fa-cogs"), " Settings"], (event) => (event.stopPropagation(), onAlgorithmSettings(entry)), {
        className: "cqiChipButton",
        title: "Open the algorithm settings",
      }),
    entry.kind === "message" &&
      chip("fa-clock-o", `${save.delay}s delay, ${save.time}s shown`, "Delay and display time"),
    entry.kind === "message" &&
      (save.videoDisplay
        ? chip("fa-hourglass-half", "During next guess", "Shows while players guess the next song")
        : chip("fa-check-circle-o", "After previous answer", "Shows during the answer of the previous song")),
    entry.kind === "message" && save.avatar && chip("fa-user", avatarName(save.avatar), "Avatar"),
    save.guessTime && chip("fa-clock-o", formatGuessTime(save.guessTime), "Guess time"),
    save.samplePoint && chip("fa-crosshairs", formatRange(save.samplePoint.samplePoint), "Sample point"),
    save.playBackSpeed && chip("fa-forward", formatSpeed(save.playBackSpeed), "Playback speed"),
    save.guessModes && guessModeChip(save.guessModes),
    save.locked && chip("fa-lock", "", "Locked"),
  ];
}

function linkCell(linkedAbove, linkedBelow) {
  const className = ["cqiLinkCell", linkedAbove && "linkedAbove", linkedBelow && "linkedBelow"]
    .filter(Boolean)
    .join(" ");
  return el(
    "td",
    { className },
    linkedAbove && el("span", { className: "cqiLinkIcon", title: "Linked" }, icon("fa-link")),
  );
}

function animeEntrySummary(entry, info) {
  const { includeSongTypes, numberOfSongs } = entry.save;
  const types = Object.values(SONG_TYPES).filter((type) => includeSongTypes[type.toLowerCase()]);
  const available = types.reduce((total, type) => total + (info.songCounts?.[type] ?? 0), 0);
  return el(
    "span",
    { className: numberOfSongs > available ? "cqiWarning" : "cqiMuted" },
    `${plural(numberOfSongs, "song")} from ${types.join("/")} (${available} available)`,
  );
}

function chip(iconName, text, title) {
  return el(
    "span",
    { className: "cqiChip", title: typeof title === "string" ? title : undefined },
    icon(iconName),
    text && ` ${text}`,
  );
}

function guessModeChip(modes) {
  if (!modes || (modes.song && !modes.tinyVideo && !modes.blurVideo)) return null;
  return el(
    "span",
    { className: "cqiChip", title: "Guess modes" },
    GUESS_MODES.filter(({ key }) => modes[key]).map(({ icon: iconName }) => icon(iconName)),
  );
}

function loadIntoBuilder(draft) {
  const { builder } = customQuizCreator;
  customQuizPreviewPlayerController.closePreview();
  builder.reset();
  builder.loadQuiz(draft.toSave().ruleBlocks);
  builder.randomOrderEnabled = draft.randomOrder;
  builder.updateRemainingSongCount();
  customQuizCreator.$nameInput.val(draft.name.trim());
  customQuizCreator.$descriptionInput.val(draft.description);
  draft.tags.forEach((tagId) => customQuizCreator.tagContainer.selectTag(tagId));
}

async function openNewQuizInCreator() {
  if (viewChanger.currentView !== "main") {
    viewChanger.changeView("main");
    await waitUntil(() => viewChanger.currentView === "main");
  }
  if (!customQuizBrowser.createMode) {
    customQuizBrowser.show();
    customQuizBrowser.setCreateMode();
  }
  const displayer = customQuizBrowser.quizDisplayer;
  await waitUntil(() => !displayer.$slotInfoContainer.hasClass("hide"));
  if (!displayer.checkCanCreateNewQuiz()) return false;

  customQuizBrowser.enterQuizCreator();
  await waitUntil(() => viewChanger.currentView === "customQuizCreator");
  return true;
}

function openImportForNewQuiz(source) {
  if (guestRegistrationController.isGuest) return messageDisplayer.displayUnavailableGuestAccountMessage();
  new ImportDialog({
    title: "Import a community quiz",
    confirmLabel: "Open in editor",
    source,
    onImport: ({ entries, quizSave, name }) => {
      const draft = quizSave ? new QuizDraft(quizSave) : QuizDraft.withEntries(name, entries);
      new QuizEditor(draft, { confirmLabel: "Create quiz", onConfirm: createQuiz }).show();
    },
  }).show();
}

async function createQuiz(draft) {
  if (!(await openNewQuizInCreator())) return false;
  loadIntoBuilder(draft);
  return true;
}

async function openEditorForCurrentQuiz() {
  try {
    await loadMasterList();
  } catch (error) {
    return messageDisplayer.displayMessage("Song list unavailable", error.message);
  }
  const draft = new QuizDraft(customQuizCreator.generateQuizSave());
  new QuizEditor(draft, {
    confirmLabel: "Apply to quiz",
    onConfirm: (editedDraft) => (loadIntoBuilder(editedDraft), true),
  }).show();
}

function addCommunityImportButton() {
  document.querySelector("#cqsFilterContainer").append(
    el(
      "div",
      {
        id: "cqiCommunityImportButton",
        className: "leftTiltButton clickAble",
        title: "Import songs into a new quiz",
        onclick: () => openImportForNewQuiz("file"),
      },
      el("div", {}, icon("fa-upload"), " Import"),
    ),
  );
}

// AMQ leaves the browser on "My Quizzes" when switching back from Build; Browse should show every quiz again.
function showPublicQuizzesAfterBuilding() {
  $("#cqsCreatorButtonContainer").on("click", () => {
    if (customQuizBrowser.createMode) return;
    const { quizDisplayer } = customQuizBrowser;
    quizDisplayer.filterController.$categorySelector.val("public");
    quizDisplayer.updateSelectedQuizzes("public");
  });
}

function addCreatorEditorButton() {
  document.querySelector("#cqcQuizCreatorButtonContainer").append(
    el(
      "div",
      {
        id: "cqiCreatorEditorButton",
        className: "cqcQuizCreatorButton rightTiltButton clickAble",
        onclick: openEditorForCurrentQuiz,
      },
      icon("fa-table"),
      el("div", {}, "Bulk Edit"),
    ),
  );
}

function addLibraryBuildButton() {
  document.querySelector("#elExpandButtonContainer").append(
    el(
      "div",
      {
        id: "cqiLibraryBuildButton",
        className: "topRightBackButton leftRightButtonTop clickAble",
        title: "Turn the current results into a community quiz",
        onclick: () => openImportForNewQuiz("library"),
      },
      el("p", {}, icon("fa-magic"), " Build Quiz"),
    ),
  );
}

const STYLE = `
:root {
  --cqi-bg: #1b1b1b;
  --cqi-panel: #2b2b2b;
  --cqi-raised: #424242;
  --cqi-hover: #6d6d6d;
  --cqi-accent: #4497ea;
  --cqi-text: #d9d9d9;
  --cqi-muted: #9a9a9a;
  --cqi-danger: #e2534e;
  --cqi-warning: #e8a33d;
  --cqi-op: #4497ea;
  --cqi-ed: #e8a33d;
  --cqi-in: #57b36a;
  --cqi-anime: #b07fe3;
}
.cqiOverlay {
  position: fixed;
  inset: 0;
  z-index: 1040;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  color: var(--cqi-text);
  font-size: 14px;
  outline: none;
}
.cqiWindow {
  display: flex;
  flex-direction: column;
  max-height: 94vh;
  background: var(--cqi-panel);
  border-radius: 6px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
  overflow: hidden;
}
.cqiImportDialog { width: min(720px, 94vw); }
.cqiEditor { width: 96vw; height: 94vh; }
.cqiHeader, .cqiFooter {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--cqi-bg);
}
.cqiHeader h2 { margin: 0 8px 0 0; font-size: 22px; }
.cqiFooter { justify-content: flex-end; }
.cqiSpacer { flex: 1; }
.cqiMuted { color: var(--cqi-muted); }
.cqiError { color: var(--cqi-danger); }
.cqiWarning { color: var(--cqi-warning); }
.cqiNoWrap { white-space: nowrap; }
.cqiEmpty { padding: 24px; text-align: center; color: var(--cqi-muted); }
.cqiButton, .cqiToggle, .cqiTab, .cqiMenuItem {
  border: none;
  border-radius: 4px;
  background: var(--cqi-raised);
  color: var(--cqi-text);
  padding: 5px 12px;
  white-space: nowrap;
  cursor: pointer;
}
.cqiButton:hover:not(:disabled), .cqiToggle:hover, .cqiTab:hover, .cqiMenuItem:hover:not(:disabled) { background: var(--cqi-hover); }
.cqiButton:disabled, .cqiMenuItem:disabled { opacity: 0.4; cursor: default; }
.cqiPrimary { background: var(--cqi-accent); color: #fff; }
.cqiPrimary:hover:not(:disabled) { background: #5aa8f0; }
.cqiDanger:hover:not(:disabled) { background: var(--cqi-danger); }
.cqiIconButton { padding: 3px 8px; background: transparent; }
.cqiInput {
  background: var(--cqi-bg);
  color: var(--cqi-text);
  border: 1px solid var(--cqi-raised);
  border-radius: 4px;
  padding: 5px 8px;
}
.cqiInput:focus { border-color: var(--cqi-accent); outline: none; }
.cqiInputShort { width: 80px; }
.cqiNameInput { width: 260px; font-size: 16px; }
.cqiTextarea { width: 100%; min-height: 140px; resize: vertical; font-family: monospace; }
.cqiInputRow, .cqiToggleGroup, .cqiChips { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.cqiToggle { background: var(--cqi-bg); }
.cqiToggle.on { background: var(--cqi-accent); color: #fff; }
.cqiToggle.cqiTypeOP.on { background: var(--cqi-op); }
.cqiToggle.cqiTypeED.on { background: var(--cqi-ed); }
.cqiToggle.cqiTypeIN.on { background: var(--cqi-in); }
.cqiToggle.cqiTypeANIME.on { background: var(--cqi-anime); }
.cqiCheckbox { display: flex; align-items: center; gap: 8px; font-weight: normal; cursor: pointer; }
.cqiDialogBody { display: flex; flex-direction: column; gap: 14px; padding: 14px; overflow: auto; }
.cqiTabs { display: flex; gap: 6px; flex-wrap: wrap; }
.cqiTab.on { background: var(--cqi-accent); color: #fff; }
.cqiSourcePanel { min-height: 150px; }
.cqiDropZone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 28px;
  border: 2px dashed var(--cqi-raised);
  border-radius: 6px;
  font-weight: normal;
  text-align: center;
  cursor: pointer;
}
.cqiDropZone .fa { font-size: 34px; color: var(--cqi-accent); }
.cqiDropZone.over, .cqiDropZone:hover { border-color: var(--cqi-accent); }
.cqiOptions { display: flex; flex-direction: column; gap: 10px; }
.cqiHistoryList {
  display: flex;
  flex-direction: column;
  max-height: 240px;
  margin-bottom: 10px;
  overflow-y: auto;
  border-radius: 4px;
  background: var(--cqi-bg);
}
.cqiHistoryGame { margin: 0; padding: 6px 10px; border-bottom: 1px solid var(--cqi-panel); }
.cqiHistoryGame:hover { background: var(--cqi-panel); }
.cqiHistoryRoom { flex: 1; }
.cqiField { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-weight: normal; margin: 0; }
.cqiField > span:first-child { width: 110px; color: var(--cqi-muted); }
.cqiSummary { flex: 1; }
.cqiEditorBody { position: relative; display: flex; flex: 1; min-height: 0; }
.cqiSidebar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 270px;
  padding: 12px;
  background: var(--cqi-bg);
  overflow: hidden;
}
.cqiSidebarHeader, .cqiBlockBar, .cqiFilterBar, .cqiSelectionBar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cqiSidebarHeader h3, .cqiBlockBar h3, .cqiDrawerHeader h3 { flex: 1; margin: 0; font-size: 17px; }
.cqiBlockBar h3 { flex: none; }
.cqiBlockList { display: flex; flex-direction: column; gap: 6px; overflow-y: auto; flex: 1; }
.cqiBlockCard {
  padding: 8px 10px;
  border-radius: 5px;
  background: var(--cqi-panel);
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.75);
  cursor: pointer;
}
.cqiBlockCard:hover { background: var(--cqi-raised); }
.cqiBlockCard.on { box-shadow: 0 0 6px 2px var(--cqi-accent); }
.cqiBlockCard.dropTarget { background: var(--cqi-accent); }
.cqiBlockTitle { display: flex; align-items: center; font-weight: bold; }
.cqiBlockActions { margin-left: auto; visibility: hidden; }
.cqiBlockCard:hover .cqiBlockActions { visibility: visible; }
.cqiBlockCard .cqiChips { margin-top: 4px; }
.cqiMain { display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 0; padding: 12px; }
.cqiQuery { flex: 1; min-width: 260px; }
.cqiSelectionBar { padding: 6px 8px; background: var(--cqi-bg); border-radius: 4px; }
.cqiSelectionCount { font-weight: bold; }
.cqiTableWrapper { flex: 1; overflow: auto; border-radius: 4px; background: var(--cqi-bg); }
.cqiTable { width: 100%; border-collapse: collapse; }
.cqiTable th {
  position: sticky;
  top: 0;
  z-index: 3;
  padding: 6px 8px;
  background: var(--cqi-raised);
  text-align: left;
  white-space: nowrap;
}
.cqiTable td { padding: 4px 8px; border-bottom: 1px solid var(--cqi-panel); }
.cqiTable tbody tr { cursor: pointer; user-select: none; }
.cqiTable tbody tr:hover { background: var(--cqi-panel); }
.cqiTable tbody tr.selected { background: rgba(68, 151, 234, 0.25); }
.cqiTable tbody tr.missing { color: var(--cqi-danger); }
.cqiTable tbody tr.dropBefore td { box-shadow: inset 0 3px 0 var(--cqi-accent); }
.cqiTable tbody tr.dropAfter td { box-shadow: inset 0 -3px 0 var(--cqi-accent); }
.cqiCheckColumn { width: 30px; }
.cqiLinkCell { position: relative; width: 18px; padding: 0 !important; }
.cqiLinkCell.linkedAbove::before, .cqiLinkCell.linkedBelow::after {
  content: "";
  position: absolute;
  left: 50%;
  border-left: 2px solid var(--cqi-accent);
  transform: translateX(-1px);
}
.cqiLinkCell.linkedAbove::before { top: 0; bottom: 50%; }
.cqiLinkCell.linkedBelow::after { top: 50%; bottom: 0; }
.cqiLinkIcon {
  position: absolute;
  left: 50%;
  top: 0;
  z-index: 1;
  padding: 1px 2px;
  border-radius: 50%;
  background: var(--cqi-bg);
  color: var(--cqi-accent);
  font-size: 12px;
  line-height: 1;
  transform: translate(-50%, -50%);
}
.cqiSimulation { width: min(1000px, 94vw); height: 90vh; }
.cqiSimulation .cqiTableWrapper { margin: 0 12px; }
.cqiSimulationBlock td { padding: 8px; background: var(--cqi-panel); font-weight: bold; }
.cqiSimulationBlock .cqiChips { display: inline-flex; margin-left: 10px; font-weight: normal; }
.cqiSimulationExtra td { color: var(--cqi-muted); font-style: italic; }
.cqiCheckColumn input { margin: 0; pointer-events: none; }
.cqiTable th.cqiCheckColumn input { pointer-events: auto; }
.cqiBadge {
  display: inline-block;
  min-width: 46px;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--cqi-raised);
  color: #fff;
  font-size: 12px;
  font-weight: bold;
  text-align: center;
}
.cqiBadge.cqiTypeOP { background: var(--cqi-op); }
.cqiBadge.cqiTypeED { background: var(--cqi-ed); }
.cqiBadge.cqiTypeIN { background: var(--cqi-in); }
.cqiBadge.cqiTypeANIME { background: var(--cqi-anime); }
.cqiChipButton { padding: 1px 8px; font-size: 12px; }
.cqiMessageInput { min-height: 80px; font-family: inherit; }
.cqiTextInput { width: 100%; }
.cqiBadge.cqiTypeALGO, .cqiBadge.cqiTypeMSG, .cqiBadge.cqiTypeTITLE { background: var(--cqi-hover); }
.cqiInfo { margin-left: 6px; color: var(--cqi-muted); font-weight: normal; cursor: help; }
.cqiInfo:hover { color: var(--cqi-accent); }
.cqiTooltip {
  position: fixed;
  z-index: 1070;
  max-width: 280px;
  padding: 6px 10px;
  border-radius: 4px;
  background: var(--cqi-bg);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
  color: var(--cqi-text);
  font-size: 13px;
  font-weight: normal;
  line-height: 1.4;
  pointer-events: none;
  visibility: hidden;
}
.cqiTooltip.show { visibility: visible; }
.cqiAvatarPreview { display: flex; align-items: center; gap: 8px; min-height: 48px; }
.cqiAvatarImage { width: 48px; height: 48px; object-fit: contain; }
#cqcQuizCreatorMessageAvatarSelectorContainer.cqiAvatarSelectorHost { position: fixed; z-index: 1050; }
.cqiChip {
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--cqi-raised);
  font-size: 12px;
  white-space: nowrap;
}
.cqiDrawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  width: 400px;
  background: var(--cqi-bg);
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.7);
  z-index: 10;
}
.cqiDrawerHeader, .cqiDrawerFooter { display: flex; align-items: center; gap: 8px; padding: 12px; }
.cqiDrawerFooter { flex-wrap: wrap; justify-content: flex-end; border-top: 1px solid var(--cqi-raised); }
.cqiDrawerFooter .cqiError { flex-basis: 100%; }
.cqiDrawerBody { display: flex; flex-direction: column; gap: 16px; padding: 12px; overflow-y: auto; flex: 1; }
.cqiDrawerRow { display: flex; flex-direction: column; gap: 6px; }
.cqiDrawerLabel { font-weight: bold; }
.cqiModes .cqiToggle { padding: 2px 10px; font-size: 12px; }
.cqiDrawerInput.disabled { opacity: 0.35; pointer-events: none; }
.cqiStatus { display: flex; gap: 18px; flex: 1; }
.cqiToast { color: var(--cqi-accent); opacity: 0; }
.cqiToast.show { animation: cqiFade 3s ease forwards; }
@keyframes cqiFade { 0%, 70% { opacity: 1; } 100% { opacity: 0; } }
.cqiMenu {
  position: fixed;
  z-index: 1045;
  display: flex;
  flex-direction: column;
  min-width: 180px;
  max-height: 70vh;
  padding: 4px;
  overflow-y: auto;
  background: var(--cqi-bg);
  border-radius: 5px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.8);
  color: var(--cqi-text);
  font-size: 14px;
}
.cqiMenuItem { background: transparent; text-align: left; }
.cqiMenuSeparator { height: 1px; margin: 4px 0; background: var(--cqi-raised); }
.cqiHelpTable td { padding: 3px 8px; vertical-align: top; white-space: normal; }
.cqiHelpTable code { color: #8cc4ff; background: none; white-space: nowrap; }
#cqsFilterContainer { position: relative; }
#cqiCommunityImportButton {
  position: absolute;
  right: -1px;
  bottom: 6px;
  padding: 3px 6px 4px 20px;
  font-size: 20px;
  line-height: 1em;
  cursor: pointer;
}
#cqiCommunityImportButton::before { background-color: #424242; }
#cqiCreatorEditorButton { margin-top: 10px; }
#cqiLibraryBuildButton {
  top: 54px;
  width: fit-content;
  padding: 0 17px 0 20px;
  font-size: 22px;
  line-height: 35px;
}
#cqiLibraryBuildButton > p { margin: 0; }
#elExpandUploadCount:not(.hide) ~ #cqiLibraryBuildButton { display: none; }
`;
