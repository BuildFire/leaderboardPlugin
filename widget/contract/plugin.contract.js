/* eslint-disable no-undef */
/**
 * Leaderboard contract — runtime implementation.
 *
 * This file only implements the operations declared with "type": "function" in plugin.contract.json. Operations typed publicData / datastore / userData / appData / firebase are declarative: their platform call is built on the fly from context.query, so they intentionally have no counterpart here. Every operation of this contract is a function.
 *
 * Each function operation is dispatched by its context.functionName, receives (options, callback), may nest any number of buildfire.* calls, and may run its own logic between them. Each one declares a context.hosts in plugin.contract.json, which is what the `hosts:` tag on the JSDoc below refers to. An operation lists every place it can run: at most one widget host, at most one control host, and headlessSdk when it is server-safe (generic always stands alone):
 *
 *   generic            no buildfire at all — pure logic, evaluated anywhere.
 *   headlessSdk        uses buildfire and is server-safe; runs on the server.
 *   widgetForeground   runs in the iframe under the app; never on the server.
 *   widgetBackground   Foreground when someone has to be watching it run — it
 *                      surfaces UI, or reaches real people so unattended is
 *                      itself a problem; Background otherwise.
 *   controlForeground  runs in the iframe under the control panel; never on
 *   controlBackground  the server. Foreground/Background by the same rule.
 *
 * headlessSdk is left out when the operation needs frame state (device, localStorage, bookmarks, the actual signed-in session, UI) or handles user-sensitive data / critical behavior that must not be reachable remotely.
 *
 * Only operations whose hosts include generic or headlessSdk are exposed to the MCP.
 *
 * `buildfire` is resolved as a global: in the widget/control hosts it comes from the injected SDK, and on the server the headless SDK provides it. `widgetContract`, `controlContract` and `frameId` are assigned as implicit globals for the same reason — the consumer reaches them without importing this file. The widget frame (widget/contract.html) and the server dispatch to widgetContract; the control panel's frame (control/contract.html) loads this same file and dispatches to controlContract.
 *
 * Every function is Node-style: callback(error, result), invoked exactly once, never with both error and result populated. Invalid input is reported through the callback rather than thrown synchronously.
 *
 * Every option a function reads here must be declared in that operation's `parameters` block, or a caller cannot pass it: the MCP server refuses any param the contract does not declare.
 *
 * Storage, as the plugin keeps it:
 *   - datastore 'Settings': the settings tab's document (widget/global/js/models/Setting.js).
 *   - datastore 'wysContent': the introduction's text, { content } (widget/global/js/models/Wysiwyg.js).
 *   - datastore, no tag: the introduction's carousel, { carouselItems } (widget/global/js/repositories/Carousels.js).
 *   - publicData, one record per leaderboard and period, tagged by the date in America/Los_Angeles
 *     (widget/global/js/repositories/Scores.js): { gamesPlayed, topScores: [{ user, score, createdOn }] }.
 */

const SETTINGS_TAG = 'Settings';
const WYSIWYG_TAG = 'wysContent';
// Mirrors widget/global/js/repositories/Scores.js: every board is a Scoreboard of size 100, sorted highest first,
// one record per user, with its dates taken in this time zone so every device lands on the same board.
const BOARD_SIZE = 100;
const BOARD_TIME_ZONE = 'America/Los_Angeles';
const MAX_BATCH = 50;

// Mirrors widget/global/js/constants/index.js.
const EARN_POINTS = { HONOR_SYSTEM: 'HONOR_SYSTEM', FROM_FTQ: 'SCORE_FROM_FREE_TEXT_QUESTIONNAIRE' };

// The four leaderboards in the order the widget writes them (widget/js/widget.controller.js addEditUserScore).
// "overall" is the board of the current year, as Scores.getYearlyTag names it.
const PERIODS = [
  { key: 'daily', boardName: 'Daily', notification: 'dailyChange', setting: 'notifyOnDailyChange' },
  { key: 'weekly', boardName: 'Weekly', notification: 'weeklyChange', setting: 'notifyOnWeeklyChange' },
  { key: 'monthly', boardName: 'Monthly', notification: 'monthlyChange', setting: 'notifyOnMonthlyChange' },
  { key: 'overall', boardName: 'Yearly', notification: 'allTimeChange', setting: 'notifyOnOverallChange' },
];

// The plugin's default texts (resources/languages.json). The contract frame loads no language strings, so these are
// what a rank change notification and an unnamed person read here.
const STRINGS = {
  unknownUser: 'Someone',
  topRankNotificationTitle: 'New HighScore!',
  topRankNotificationMessage: '${context.plugin.userName} is now at first place in the ${context.plugin.boardName} board! Can you take over?', // eslint-disable-line no-template-curly-in-string
  lowerRankNotificationTitle: 'Things are heating at the top!',
  lowerRankNotificationMessage: '${context.plugin.userName} is now at ${context.plugin.rank} place from ${context.plugin.oldPositionUser} in the ${context.plugin.boardName} board! Can you take over?', // eslint-disable-line no-template-curly-in-string
};

/**
 * Assert that every named option is a non-empty string.
 * @returns {boolean} true when valid; false when the callback has already fired.
 */
const requireStringParams = (options, names, callback) => {
  if (typeof callback !== 'function') {
    // Nothing to report through; fail loudly only in this one unrecoverable case.
    throw new TypeError('callback must be a function');
  }
  if (options === null || typeof options !== 'object') {
    callback(new Error('options must be an object'), undefined);
    return false;
  }
  const missing = names.find((name) => typeof options[name] !== 'string' || !options[name]);
  if (missing) {
    callback(new Error(`Missing required parameter: ${missing}`), undefined);
    return false;
  }
  return true;
};

/**
 * Assert the callback is a function and options an object, for operations whose params are all optional or not strings.
 * @returns {boolean} true when valid; false when the callback has already fired.
 */
const requireOptions = (options, callback) => requireStringParams(options === undefined ? {} : options, [], callback);

/**
 * A whole number param, checked against its declared lower bound. The widget's score dialog parses what is typed with parseInt, so fractions are refused rather than silently cut.
 * @returns {string|null} why the value is refused, or null when it is valid.
 */
const checkWholeNumber = (value, name, minValue) => {
  if (value === undefined || value === null) return `Missing required parameter: ${name}`;
  if (typeof value !== 'number' || !Number.isInteger(value)) return `${name} must be a whole number`;
  if (minValue !== undefined && value < minValue) return `${name} must be at least ${minValue}`;
  return null;
};

/** A date as the clock reads it in America/Los_Angeles. Mirrors Scores.getStandardDate. */
const getStandardDate = (date) => new Date(date.toLocaleString('en-US', { timeZone: BOARD_TIME_ZONE }));

/**
 * The publicData tag of each period's board for a date. Mirrors Scores.getDailyTag / getWeeklyTag / getMonthlyTag / getYearlyTag, character for character, so the contract reads and writes the boards the widget shows.
 * @returns {{ daily: string, weekly: string, monthly: string, overall: string }}
 */
const boardTags = (now) => {
  const date = getStandardDate(now);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const firstDayOfWeek = new Date(year, date.getMonth(), 1).getDay();
  const weekNumber = Math.ceil((date.getDate() + firstDayOfWeek) / 7);
  return {
    daily: `daily_${date.getDate()}${month}${year}`,
    weekly: `weekly_${weekNumber}${month}${year}`,
    monthly: `${month}${year}`,
    overall: `${year}`,
  };
};

/** The name a person goes by on the leaderboard. Mirrors Scores.getScores, with the plugin's default text for an unnamed person. */
const displayNameOf = (user) => {
  if (!user) return STRINGS.unknownUser;
  const joined = user.firstName && user.lastName ? `${user.firstName}${user.lastName}` : '';
  return user.displayName || joined || user.firstName || STRINGS.unknownUser;
};

/** A list from an auth lookup, whether it answers a list or a page of results. */
const asList = (value) => {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.result)) return value.result;
  return value ? [value] : [];
};

/**
 * The person a caller named, by user id or email, as an app user record. The signed-in user is used as is when it is the one named — that is the user the widget itself stores on its boards. Anyone else is looked up in the app's users: an email (it has an @) through getUsersByEmail, an id through getUserProfile.
 * @param {string} value - the user id or email given
 * @param {function(Error=, object=)} callback - (error, user)
 */
const resolveUser = (value, callback) => {
  const isEmail = value.indexOf('@') >= 0;
  const matches = (user) => !!user && (isEmail
    ? typeof user.email === 'string' && user.email.toLowerCase() === value.toLowerCase()
    : user._id === value || user.userId === value);

  buildfire.auth.getCurrentUser((currentErr, currentUser) => {
    // Nobody signed in is not a failure here: the person is then looked up like anyone else.
    if (!currentErr && matches(currentUser)) return callback(null, currentUser);

    const found = (err, users) => {
      if (err) return callback(new Error(`No person found for "${value}": ${err.message || err}`), undefined);
      const user = asList(users).find(matches);
      if (!user) return callback(new Error(`No person found for "${value}"`), undefined);
      return callback(null, user);
    };
    if (isEmail) return buildfire.auth.getUsersByEmail({ emails: [value] }, found);
    return buildfire.auth.getUserProfile({ userId: value }, found);
  });
};

/**
 * The person as a board stores them. The widget stores the signed-in user it holds, with `id` set to `_id` (BFGamifyComponent logScore matches people by `id`); here only the fields the boards read are kept, so no session token is ever written to the public boards.
 */
const toBoardUser = (user) => {
  const id = user._id || user.userId;
  const boardUser = { _id: id, id };
  ['userId', 'displayName', 'firstName', 'lastName', 'email'].forEach((key) => {
    if (user[key] !== undefined && user[key] !== null) boardUser[key] = user[key];
  });
  return boardUser;
};

/**
 * One board's record. Mirrors Scoreboard.getScoreboard: a board nothing was logged to yet reads as empty.
 * @param {function(Error=, object=)} callback - (error, { id, data: { gamesPlayed, topScores } })
 */
const readBoard = (tag, callback) => {
  buildfire.publicData.get(tag, (err, result) => {
    if (err) return callback(err, undefined);
    const data = (result && result.data) || {};
    if (Array.isArray(data.topScores)) return callback(null, { id: result.id, data });
    return callback(null, { id: result && result.id, data: { gamesPlayed: 0, topScores: [] } });
  });
};

/** Run fn over every entry in turn, then call done with every result. Node-style, so the boards are read and written one at a time. */
const eachInTurn = (entries, fn, done) => {
  const results = [];
  const next = (index) => {
    if (index === entries.length) return done(null, results);
    return fn(entries[index], index, (err, result) => {
      if (err) return done(err, undefined);
      results.push(result);
      return next(index + 1);
    });
  };
  next(0);
};

/** The settings document with the model's defaults applied. Mirrors widget/global/js/models/Setting.js. */
const normalizeSettings = (data = {}) => ({
  features: data.features || [],
  notificationsFrequency: data.notificationsFrequency || [],
  userEarnPoints: data.userEarnPoints || EARN_POINTS.HONOR_SYSTEM,
  calculateLoyaltyPoints: typeof data.calculateLoyaltyPoints === 'boolean' ? data.calculateLoyaltyPoints : false,
  isAnalyticsRegistered: typeof data.isAnalyticsRegistered === 'boolean' ? data.isAnalyticsRegistered : false,
});

/** The settings as callers see them: the stored document without the plugin's own analytics bookkeeping. */
const publicSettings = (settings) => ({
  notificationsFrequency: settings.notificationsFrequency,
  userEarnPoints: settings.userEarnPoints,
  features: settings.features,
  calculateLoyaltyPoints: settings.calculateLoyaltyPoints,
});

/** @param {function(Error=, object=)} callback - (error, settings with defaults applied) */
const readSettings = (callback) => {
  buildfire.datastore.get(SETTINGS_TAG, (err, result) => {
    if (err) return callback(err, undefined);
    return callback(null, normalizeSettings((result && result.data) || {}));
  });
};

/** Tell the widget to refresh, the way the control panel's tabs do after a save; there is no widget to tell on the server. */
const syncWithWidget = (message) => {
  if (buildfire.messaging && typeof buildfire.messaging.sendMessageToWidget === 'function') {
    buildfire.messaging.sendMessageToWidget(message);
  }
};

/** Fire a declared event without waiting on it: an event never delays or fails the action it reports. */
const sendEvent = (name, data) => {
  const { services } = buildfire;
  if (services && services.contract && services.contract.events && typeof services.contract.events.send === 'function') {
    services.contract.events.send(name, data);
  }
};

/** Fill ${context.plugin.<key>} the way the widget's dynamic expressions fill its notification texts. */
const fillText = (text, values) => text.replace(/\$\{context\.plugin\.(\w+)\}/g, (match, key) => (values[key] === undefined ? '' : String(values[key])));

/**
 * Send the rank change notification Scoreboard.logScore sends after a write, to everyone following that board. Sent only where the push notification service is loaded, as logScore checks with _PNEnabled; the contract frames load none, so there nothing is sent.
 */
const notifyRankChange = (tag, user, boardName, outcome) => {
  const { notifications } = buildfire;
  const push = notifications && notifications.pushNotification;
  if (!push || typeof push.schedule !== 'function') return;

  let title;
  let text;
  if (outcome.rankedAt === 0) {
    title = STRINGS.topRankNotificationTitle;
    text = fillText(STRINGS.topRankNotificationMessage, { userName: outcome.userDisplayName, boardName });
  } else if (outcome.bumpedOff && outcome.bumpedOff.user.email !== user.email) {
    title = STRINGS.lowerRankNotificationTitle;
    text = fillText(STRINGS.lowerRankNotificationMessage, {
      userName: outcome.userDisplayName, boardName, rank: outcome.bumpedOff.position, oldPositionUser: outcome.bumpedDisplayName,
    });
  }
  if (!title) return;
  push.schedule({
    title, text, groupName: `scoreboard_${tag}`, sendToSelf: false,
  }, (err) => { if (err) console.error(err); });
};

/**
 * Who the new score pushed out of the top three, if anyone, marked with the place they lost. Mirrors the top-three check in Scoreboard.logScore, including that it marks `position` on the record it finds.
 */
const findBumpedOff = (previousTopThree, newTopThree, userId) => {
  const isUser = (entry) => !!entry && !!entry.user && entry.user.id === userId;
  const userNewRank = newTopThree.findIndex(isUser);
  if (userNewRank < 0) return undefined;
  const userPreviousRank = previousTopThree.findIndex(isUser);
  if (userPreviousRank >= 0 && userNewRank === userPreviousRank) return undefined;
  const bumpedOff = previousTopThree[userNewRank];
  if (bumpedOff) bumpedOff.position = ['first', 'second', 'third'][userNewRank];
  return bumpedOff;
};

/**
 * Write a person's new total to one board. Mirrors Scoreboard.logScore with overrideRecords and highest first: the person's entry is replaced (or added), the board re-sorted and gamesPlayed counted, then the rank change notification goes out when the settings ask for it on this board. The push subscription logScore makes first is left out: it signs up the device in the frame, which belongs to whoever uses it, not to the person named.
 * @param {function(Error=, object=)} callback - (error, { rankedAt })
 */
const logScore = (tag, user, score, boardName, isNotifying, callback) => {
  const createdOn = new Date();
  const newRec = { user, score, createdOn };

  buildfire.publicData.get(tag, (err, result) => {
    if (err) return callback(err, undefined);
    const stored = (result && result.data) || {};

    if (!Array.isArray(stored.topScores)) {
      return buildfire.publicData.save({ gamesPlayed: 1, topScores: [newRec] }, tag, (saveErr) => {
        if (saveErr) return callback(saveErr, undefined);
        return callback(null, { rankedAt: 0 });
      });
    }

    // A full board keeps only scores above its lowest place; logScore writes nothing for one below it.
    if (stored.topScores.length > BOARD_SIZE && stored.topScores[BOARD_SIZE - 1].score > score) {
      return callback(null, { rankedAt: null });
    }

    const previousTopThree = stored.topScores.slice(0, 3);
    const data = stored;
    const found = data.topScores.findIndex((entry) => entry.user && entry.user.id === user.id);
    if (found >= 0) data.topScores[found] = newRec;
    else data.topScores.push(newRec);
    data.topScores = data.topScores.sort((a, b) => b.score - a.score);

    const bumpedOff = findBumpedOff(previousTopThree, data.topScores.slice(0, 3), user.id);
    data.gamesPlayed = (data.gamesPlayed || 0) + 1;

    return buildfire.publicData.update(result.id, data, tag, (updateErr) => {
      if (updateErr) return callback(updateErr, undefined);
      const outcome = {
        bumpedOff,
        rankedAt: data.topScores.indexOf(newRec),
        userDisplayName: displayNameOf(user),
        bumpedDisplayName: bumpedOff ? displayNameOf(bumpedOff.user) : null,
      };
      if (isNotifying) notifyRankChange(tag, user, boardName, outcome);
      return callback(null, { rankedAt: outcome.rankedAt });
    });
  });
};

/**
 * Change one person's score on all four boards, the way the widget's score dialog does (widget/js/widget.controller.js addEditUserScore). Reads the person's current score on each board, works out the new totals — "add" adds the points to every board; "edit" sets today's score and moves the week, month and overall totals by the same difference — then writes each board through logScore, with each board's rank change notification on when the settings ask for it. Then fires scoreUpdated, and counts a logged score in analytics for an add, as the dialog does. Shared by the single and batch operations, so every person gets exactly the same.
 * @param {{ user: object, settings: object, changeType: string, points: number }} change
 * @param {function(Error=, object=)} callback - (error, scores after the change)
 */
const applyScoreChange = ({
  user, settings, changeType, points,
}, callback) => {
  const boardUser = toBoardUser(user);
  const tags = boardTags(new Date());

  eachInTurn(PERIODS, (period, index, next) => readBoard(tags[period.key], (err, board) => {
    if (err) return next(err);
    const entry = board.data.topScores.find((score) => score.user && score.user._id === boardUser._id);
    return next(null, (entry && entry.score) || 0);
  }), (readErr, current) => {
    if (readErr) return callback(readErr, undefined);

    const [daily, weekly, monthly, overall] = current;
    const totals = changeType === 'edit'
      ? [points, weekly - daily + points, monthly - daily + points, overall - daily + points]
      : [daily + points, weekly + points, monthly + points, overall + points];

    return eachInTurn(PERIODS, (period, index, next) => logScore(
      tags[period.key],
      boardUser,
      totals[index],
      period.boardName,
      settings.notificationsFrequency.includes(period.notification),
      next,
    ), (writeErr) => {
      if (writeErr) return callback(writeErr, undefined);

      const result = {
        userId: boardUser._id,
        displayName: displayNameOf(boardUser),
        dailyScore: totals[0],
        weeklyScore: totals[1],
        monthlyScore: totals[2],
        overallScore: totals[3],
      };
      sendEvent('scoreUpdated', {
        user: { userId: boardUser._id, displayName: boardUser.displayName || null, email: boardUser.email || null },
        changeType,
        points,
        dailyScore: result.dailyScore,
        weeklyScore: result.weeklyScore,
        monthlyScore: result.monthlyScore,
        overallScore: result.overallScore,
      });
      if (changeType === 'add' && buildfire.analytics && typeof buildfire.analytics.trackAction === 'function') {
        buildfire.analytics.trackAction('score-logged');
      }
      return callback(null, result);
    });
  });
};

/**
 * The settings, refused when people earn points only from questionnaires: the widget then offers no way to add or edit a score by hand (widget/js/pages/home.js showAddScoreView; the edit icon in scoreSwipeableDrawer.js shows only on the honor system).
 * @param {function(Error=, object=)} callback - (error, settings)
 */
const requireHonorSystem = (callback) => {
  readSettings((err, settings) => {
    if (err) return callback(err, undefined);
    if (settings.userEarnPoints === EARN_POINTS.FROM_FTQ) {
      return callback(new Error('Points on this leaderboard come only from questionnaires, so scores cannot be changed by hand'), undefined);
    }
    return callback(null, settings);
  });
};

/**
 * One person's score change: validate, check the settings allow it, find the person, then apply it.
 * @param {string} amountName - 'points' or 'newScore', the param holding the amount
 */
const changeOneScore = (options, changeType, amountName, minValue, callback) => {
  if (!requireStringParams(options, ['user'], callback)) return;
  const invalid = checkWholeNumber(options[amountName], amountName, minValue);
  if (invalid) return callback(new Error(invalid), undefined);

  requireHonorSystem((settingsErr, settings) => {
    if (settingsErr) return callback(settingsErr, undefined);
    return resolveUser(options.user, (userErr, user) => {
      if (userErr) return callback(userErr, undefined);
      return applyScoreChange({
        user, settings, changeType, points: options[amountName],
      }, callback);
    });
  });
};

/**
 * Several people's score changes: every entry validated, the settings checked and every person found before anything is written; the same person twice is refused. Then each entry goes through applyScoreChange in turn; a failed write is reported for its entry and the rest go on.
 */
const changeManyScores = (options, changeType, amountName, minValue, callback) => {
  if (!requireOptions(options, callback)) return;
  const entries = options.scores;
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > MAX_BATCH) {
    return callback(new Error(`scores must be a list of 1 to ${MAX_BATCH} entries`), undefined);
  }

  const invalid = entries.map((entry, index) => {
    if (!entry || typeof entry !== 'object') return `entry ${index}: must be an object`;
    if (typeof entry.user !== 'string' || !entry.user) return `entry ${index}: missing user`;
    const error = checkWholeNumber(entry[amountName], amountName, minValue);
    return error ? `entry ${index}: ${error}` : null;
  }).filter(Boolean);
  if (invalid.length) return callback(new Error(`Invalid entries: ${invalid.join('; ')}`), undefined);

  requireHonorSystem((settingsErr, settings) => {
    if (settingsErr) return callback(settingsErr, undefined);

    const users = [];
    const unknown = [];
    return eachInTurn(entries, (entry, index, next) => resolveUser(entry.user, (err, user) => {
      if (err) unknown.push(`entry ${index}: ${err.message}`);
      else users[index] = user;
      next(null);
    }), () => {
      if (unknown.length) return callback(new Error(`Not found: ${unknown.join('; ')}`), undefined);
      if (new Set(users.map((user) => user._id)).size !== users.length) {
        return callback(new Error('The same person is listed more than once'), undefined);
      }

      const results = [];
      return eachInTurn(entries, (entry, index, next) => applyScoreChange({
        user: users[index], settings, changeType, points: entry[amountName],
      }, (err) => {
        results.push({ index, id: err ? null : users[index]._id, error: err ? (err.message || String(err)) : null });
        next(null);
      }), () => {
        const failed = results.filter((r) => r.error).length;
        callback(null, { scores: results, succeeded: results.length - failed, failed });
      });
    });
  });
};

/**
 * The questionnaire list a settings update asks for. Each must be an action item linking to a feature of the app: the widget opens features[n].instanceId and reads that instance's submissions. Each keeps its place as `order`, as the settings tab numbers an added one.
 * @returns {{ features?: object[], error?: string }}
 */
const readQuestionnaires = (value) => {
  if (value === null) return { features: [] };
  if (!Array.isArray(value)) return { error: 'questionnaires must be a list of action items' };
  const bad = value.findIndex((item) => !item || typeof item !== 'object' || Array.isArray(item)
    || typeof item.instanceId !== 'string' || !item.instanceId);
  if (bad >= 0) return { error: `questionnaires entry ${bad} must be an action item linking to a questionnaire feature (with an instanceId)` };
  return { features: value.map((item, order) => ({ ...item, order })) };
};

/**
 * The carousel a introduction update asks for: action items, each with its picture in iconUrl, which is what the carousel shows.
 * @returns {{ items?: object[], error?: string }}
 */
const readCarouselItems = (value) => {
  if (value === null) return { items: [] };
  if (!Array.isArray(value)) return { error: 'carouselItems must be a list of action items' };
  const bad = value.findIndex((item) => !item || typeof item !== 'object' || Array.isArray(item)
    || typeof item.iconUrl !== 'string' || !item.iconUrl);
  if (bad >= 0) return { error: `carouselItems entry ${bad} must be an action item with a picture (iconUrl)` };
  return { items: value };
};

/** @param {function(Error=, object=)} callback - (error, { carouselItems, description }) */
const readIntroduction = (callback) => {
  // The carousel lives in the instance's untagged datastore record, as Carousels.get reads it.
  buildfire.datastore.get((carouselErr, carousel) => {
    if (carouselErr) return callback(carouselErr, undefined);
    return buildfire.datastore.get(WYSIWYG_TAG, (textErr, text) => {
      if (textErr) return callback(textErr, undefined);
      return callback(null, {
        carouselItems: (carousel && carousel.data && carousel.data.carouselItems) || [],
        description: (text && text.data && text.data.content) || '',
      });
    });
  });
};

widgetContract = {
  /**
   * Bind this contract to a plugin instance. Called by the consumer; resolves the iframe window that widget/control-hosted operations are proxied into.
   * @param {string} instanceId - the plugin instance to contract with.
   */
  init(instanceId) {
    buildfire.services.contract.use({ instanceId }, (err, data) => {
      if (err) return console.error('Failed to initialize leaderboard contract', err);
      frameId = data.fid;
    });
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. One leaderboard for the current period, as the widget's drawer shows it (Scores.getScores): every person on it, highest first, with their place, name, score and picture. Reads one publicData record, whose tag depends on today's date in America/Los_Angeles, which is why it is a function rather than a declarative get. The person filter matches the stored user's id, or email ignoring case, so it needs no lookup. Uses only buildfire.publicData and the SDK's picture-address helper, which behave the same in both frames and on the server; nothing about it needs to be watched, so Background in both frames.
   * Period values come from widget/global/js/constants/index.js (enums.Keys) and the drawer's tabs in widget/js/scoreSwipeableDrawer.js.
   * @param {{ period?: string, user?: string }} options
   * @param {function(Error=, object=)} callback - (error, { period, scores })
   */
  listScores(options, callback) {
    if (!requireOptions(options, callback)) return;
    const opts = options || {};
    const period = opts.period === undefined ? 'overall' : opts.period;
    if (!PERIODS.some((p) => p.key === period)) {
      return callback(new Error(`period must be one of: ${PERIODS.map((p) => p.key).join(', ')}`), undefined);
    }
    if (opts.user !== undefined && (typeof opts.user !== 'string' || !opts.user)) {
      return callback(new Error('user must be a user id or email'), undefined);
    }

    readBoard(boardTags(new Date())[period], (err, board) => {
      if (err) return callback(err, undefined);
      const wanted = opts.user && opts.user.toLowerCase();
      const scores = board.data.topScores.map((entry, index) => {
        const user = entry.user || {};
        let displayPictureUrl = null;
        try {
          displayPictureUrl = buildfire.auth.getUserPictureUrl({ userId: user._id });
        } catch (pictureErr) {
          displayPictureUrl = null;
        }
        return {
          rank: index + 1,
          userId: user._id,
          displayName: displayNameOf(user),
          currentScore: entry.score,
          displayPictureUrl,
          createdOn: entry.createdOn,
          email: user.email,
        };
      }).filter((entry) => !wanted || entry.userId === opts.user
        || (typeof entry.email === 'string' && entry.email.toLowerCase() === wanted))
        .map(({ email, ...entry }) => entry);
      return callback(null, { period, scores });
    });
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. usage: basic. Adds points to a person's score on all four boards, as the widget's "Add Points" dialog does, on behalf of the app; the person is named by user id or email (see resolveUser) and is the target, not the actor. Refused when the settings give points only from questionnaires, as the widget offers no dialog then. Points must be a whole number of at least 1: Scores.addScore, the plugin's own add, refuses zero and negative scores. Multi-step over the SDK: settings, the person, four board reads, then four read-and-write board updates, each depending on the one before, which is why it is not declarative. Uses buildfire.datastore (read), buildfire.publicData and buildfire.auth, which behave the same in both frames and on the server, so all three hosts. Background in both frames: it changes a score, and the rank change notification it may send to people following the board is flagged dangerous for the MCP rather than watched. There is no advanced alternative: a person is already named by id or email.
   * @param {{ user: string, points: number }} options
   * @param {function(Error=, object=)} callback - (error, { userId, displayName, dailyScore, weeklyScore, monthlyScore, overallScore })
   */
  updateUserScore(options, callback) {
    changeOneScore(options, 'add', 'points', 1, callback);
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. usage: advanced (batches are never basic). The batch form of updateUserScore: every entry validated, the settings checked and every person found before anything is written, the same person twice refused; then each entry goes through applyScoreChange in turn, so everyone gets exactly what updateUserScore does. Entries run one after another because they write the same four board records. Same hosts and reasons as updateUserScore.
   * @param {{ scores: Array<{ user: string, points: number }> }} options
   * @param {function(Error=, object=)} callback - (error, { scores, succeeded, failed })
   */
  updateUserScoresAdvanced(options, callback) {
    changeManyScores(options, 'add', 'points', 1, callback);
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. usage: basic. Sets a person's score for today, as the widget's edit dialog on today's board does, on behalf of the app: the week, month and overall totals move by the difference between the old and new score for today. Refused when the settings give points only from questionnaires, as the edit icon shows only on the honor system. The new score must be a whole number; the dialog sets no other bound. Same steps, hosts and reasons as updateUserScore.
   * @param {{ user: string, newScore: number }} options
   * @param {function(Error=, object=)} callback - (error, { userId, displayName, dailyScore, weeklyScore, monthlyScore, overallScore })
   */
  updateUserDailyScore(options, callback) {
    changeOneScore(options, 'edit', 'newScore', undefined, callback);
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. usage: advanced (batches are never basic). The batch form of updateUserDailyScore, run like updateUserScoresAdvanced.
   * @param {{ scores: Array<{ user: string, newScore: number }> }} options
   * @param {function(Error=, object=)} callback - (error, { scores, succeeded, failed })
   */
  updateUserDailyScoresAdvanced(options, callback) {
    changeManyScores(options, 'edit', 'newScore', undefined, callback);
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: basic. Clears the four current boards, as the settings tab's Reset button does (Scores.reset): each saved as { gamesPlayed: 0, topScores: [] }, daily, weekly, monthly then overall, then the widget is told to reload. Unlike Scores.reset, a failed save is reported rather than ignored. Uses only buildfire.publicData, so it runs the same in the control panel and on the server. No widget host: the app offers no reset, and app users must not wipe the owner's leaderboard. Background: the control panel's own confirmation is the dangerous flag here, and nobody is contacted.
   * @param {object} options - none
   * @param {function(Error=, object=)} callback - (error, { periods })
   */
  resetLeaderboard(options, callback) {
    if (!requireOptions(options, callback)) return;
    const tags = boardTags(new Date());
    eachInTurn(PERIODS, (period, index, next) => buildfire.publicData.save({ gamesPlayed: 0, topScores: [] }, tags[period.key], (err) => {
      if (err) return next(err);
      return next(null, period.key);
    }), (err, periods) => {
      if (err) return callback(err, undefined);
      syncWithWidget({ cmd: 'reset' });
      return callback(null, { periods });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: basic. The settings tab's settings, with the model's defaults applied as the tab loads them (Setting.js); the plugin's own analytics flag is left out. Uses only buildfire.datastore, the same in the control panel and on the server. No widget host: it is the owner's configuration. Background: it only reads.
   * @param {object} options - none
   * @param {function(Error=, object=)} callback - (error, settings)
   */
  getSettings(options, callback) {
    if (!requireOptions(options, callback)) return;
    readSettings((err, settings) => {
      if (err) return callback(err, undefined);
      return callback(null, publicSettings(settings));
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: basic. Changes the settings the way the settings tab does: each notification checkbox adds or removes its key in notificationsFrequency, the radio sets userEarnPoints, the switch sets calculateLoyaltyPoints, and the questionnaire list replaces features. Only what is passed changes. The tab saves the whole document with datastore.save through the Setting model, so this reads, merges, saves the same way, then sends the widget the { cmd: 'settings' } message the tab sends. userEarnPoints values come from enums.EARN_POINTS (constants/index.js) and the radio buttons in control/settings/index.html. No widget host: app users must not change the owner's configuration. Background: it changes configuration, it does not publish to or contact anyone.
   * @param {{ notifyOnDailyChange?: boolean, notifyOnWeeklyChange?: boolean, notifyOnMonthlyChange?: boolean, notifyOnOverallChange?: boolean, userEarnPoints?: string, questionnaires?: object[]|null, calculateLoyaltyPoints?: boolean }} options
   * @param {function(Error=, object=)} callback - (error, settings as saved)
   */
  updateSettings(options, callback) {
    if (!requireOptions(options, callback)) return;
    const opts = options || {};
    const changes = [];

    const badFlag = PERIODS.find((period) => opts[period.setting] !== undefined && typeof opts[period.setting] !== 'boolean');
    if (badFlag) return callback(new Error(`${badFlag.setting} must be true or false`), undefined);
    PERIODS.forEach((period) => {
      if (opts[period.setting] === undefined) return;
      // A checked box adds its key once, an unchecked one removes it; the other keys keep their order.
      changes.push((settings) => {
        const list = settings.notificationsFrequency;
        if (!opts[period.setting]) settings.notificationsFrequency = list.filter((key) => key !== period.notification);
        else if (!list.includes(period.notification)) settings.notificationsFrequency = list.concat([period.notification]);
      });
    });

    if (opts.userEarnPoints !== undefined) {
      if (!Object.values(EARN_POINTS).includes(opts.userEarnPoints)) {
        return callback(new Error(`userEarnPoints must be one of: ${Object.values(EARN_POINTS).join(', ')}`), undefined);
      }
      changes.push((settings) => { settings.userEarnPoints = opts.userEarnPoints; });
    }

    if (opts.questionnaires !== undefined) {
      const { features, error } = readQuestionnaires(opts.questionnaires);
      if (error) return callback(new Error(error), undefined);
      changes.push((settings) => { settings.features = features; });
    }

    if (opts.calculateLoyaltyPoints !== undefined) {
      if (typeof opts.calculateLoyaltyPoints !== 'boolean') return callback(new Error('calculateLoyaltyPoints must be true or false'), undefined);
      changes.push((settings) => { settings.calculateLoyaltyPoints = opts.calculateLoyaltyPoints; });
    }

    if (!changes.length) return callback(new Error('Pass at least one setting to change'), undefined);

    readSettings((err, current) => {
      if (err) return callback(err, undefined);
      const settings = normalizeSettings(current);
      changes.forEach((change) => change(settings));
      return buildfire.datastore.save(settings, SETTINGS_TAG, (saveErr) => {
        if (saveErr) return callback(saveErr, undefined);
        syncWithWidget({ cmd: 'settings', data: settings });
        return callback(null, publicSettings(settings));
      });
    });
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. usage: basic. The introduction the widget shows behind the leaderboard drawer: the carousel (untagged datastore record) and the formatted text ('wysContent'), read as Carousels.get and Wysiwygs.get read them. Two reads, which is why it is a function. Uses only buildfire.datastore, the same in both frames and on the server; it only reads, so Background in both frames.
   * @param {object} options - none
   * @param {function(Error=, object=)} callback - (error, { carouselItems, description })
   */
  getIntroduction(options, callback) {
    if (!requireOptions(options, callback)) return;
    readIntroduction(callback);
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: basic. Changes the introduction the way the content tab does: the carousel editor saves the whole list as { carouselItems } in the untagged record, then sends { cmd: 'carousel' } to the widget; the text editor saves { content } under 'wysContent', then sends { cmd: 'wysiwyg' }. Only what is passed is saved. A list replaces the current one; null or [] empties the carousel, and null or '' the text, stored as the models store an emptied value ([] and ''). The text is stored as passed, with no cleaning the content tab does not do. No widget host: app users must not change the owner's content. Background: an edit of the owner's content, nobody is contacted.
   * @param {{ carouselItems?: object[]|null, description?: string|null }} options
   * @param {function(Error=, object=)} callback - (error, { carouselItems, description })
   */
  updateIntroduction(options, callback) {
    if (!requireOptions(options, callback)) return;
    const opts = options || {};
    const writes = [];

    if (opts.carouselItems !== undefined) {
      const { items, error } = readCarouselItems(opts.carouselItems);
      if (error) return callback(new Error(error), undefined);
      writes.push((next) => buildfire.datastore.save({ carouselItems: items }, (err) => {
        if (err) return next(err);
        syncWithWidget({ cmd: 'carousel', data: items });
        return next(null);
      }));
    }

    if (opts.description !== undefined) {
      if (opts.description !== null && typeof opts.description !== 'string') {
        return callback(new Error('description must be formatted text, null or an empty string'), undefined);
      }
      const content = opts.description || '';
      writes.push((next) => buildfire.datastore.save({ content }, WYSIWYG_TAG, (err) => {
        if (err) return next(err);
        syncWithWidget({ cmd: 'wysiwyg', data: content });
        return next(null);
      }));
    }

    if (!writes.length) return callback(new Error('Pass carouselItems or description to change'), undefined);

    eachInTurn(writes, (write, index, next) => write(next), (err) => {
      if (err) return callback(err, undefined);
      return readIntroduction(callback);
    });
  },
};

/**
 * What the control panel's frame (control/contract.html) dispatches to: init plus every function whose hosts include controlForeground or controlBackground, in plugin.contract.json order. The implementations are widgetContract's own.
 */
controlContract = {
  init: widgetContract.init,
  listScores: widgetContract.listScores,
  updateUserScore: widgetContract.updateUserScore,
  updateUserScoresAdvanced: widgetContract.updateUserScoresAdvanced,
  updateUserDailyScore: widgetContract.updateUserDailyScore,
  updateUserDailyScoresAdvanced: widgetContract.updateUserDailyScoresAdvanced,
  resetLeaderboard: widgetContract.resetLeaderboard,
  getSettings: widgetContract.getSettings,
  updateSettings: widgetContract.updateSettings,
  getIntroduction: widgetContract.getIntroduction,
  updateIntroduction: widgetContract.updateIntroduction,
};
