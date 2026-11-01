/* eslint-disable no-undef */
/**
 * Leaderboard contract — runtime implementation.
 *
 * This file only implements the operations declared with "type": "function" in plugin.contract.json. Operations typed publicData / datastore / userData / appData / firebase are declarative: their platform call is built on the fly from context.query, so they intentionally have no counterpart here. Every operation of this plugin is a function: the scoreboards live in publicData under tags computed from today's date, and every write the control panel makes also refreshes the widget.
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
 */

// Mirrors widget/global/js/repositories/Settings.js and Wysiwygs.js. The carousel has no tag of its own:
// widget/global/js/repositories/Carousels.js saves and reads it with the datastore's default tag, and so does this file.
const SETTINGS_TAG = 'Settings';
const DESCRIPTION_TAG = 'wysContent';

// Mirrors widget/global/js/constants/index.js.
const EARN_POINTS = ['HONOR_SYSTEM', 'SCORE_FROM_FREE_TEXT_QUESTIONNAIRE'];
const PERIODS = ['daily', 'weekly', 'monthly', 'overall'];
const LOG_TYPES = ['add', 'edit'];
const CHANGE_LABELS = { add: 'Added', edit: 'Edited' };
// The board name each period's scores are logged under, and the notification setting that announces its changes.
const BOARD_NAMES = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  overall: 'Yearly',
};
const NOTIFICATION_FREQUENCIES = {
  daily: 'dailyChange',
  weekly: 'weeklyChange',
  monthly: 'monthlyChange',
  overall: 'allTimeChange',
};
// Mirrors the 100 every Scoreboard of widget/global/js/repositories/Scores.js is created with.
const BOARD_SIZE = 100;
const POSITIONS = ['first', 'second', 'third'];
// The default wording of resources/languages.json. buildfire.language.get answers only on the plugin's own pages,
// so a wording the owner changed in the Language tab is not applied here.
/* eslint-disable no-template-curly-in-string */
const STRINGS = {
  unknownUser: 'Someone',
  topRankNotificationTitle: 'New HighScore!',
  topRankNotificationMessage: '${context.plugin.userName} is now at first place in the ${context.plugin.boardName} board! Can you take over?',
  lowerRankNotificationTitle: 'Things are heating at the top!',
  lowerRankNotificationMessage: '${context.plugin.userName} is now at ${context.plugin.rank} place from ${context.plugin.oldPositionUser} in the ${context.plugin.boardName} board! Can you take over?',
};
/* eslint-enable no-template-curly-in-string */

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
 * Run callback-style tasks side by side and report once: the first error, or every result in task order.
 * @param {Array<function(function(Error=, *=))>} tasks
 * @param {function(Error=, Array=)} callback
 */
const runAll = (tasks, callback) => {
  const results = [];
  let pending = tasks.length;
  let failed = false;
  if (!pending) return callback(null, results);
  tasks.forEach((task, index) => {
    task((error, result) => {
      if (failed) return;
      if (error) {
        failed = true;
        return callback(error, undefined);
      }
      results[index] = result;
      pending -= 1;
      if (!pending) callback(null, results);
    });
  });
};

/**
 * The tag of each period's board for today. Mirrors Scores.getStandardDate and the getDailyTag / getWeeklyTag / getMonthlyTag / getYearlyTag helpers of widget/global/js/repositories/Scores.js: dates are taken in America/Los_Angeles so every user shares the same boards whatever their time zone.
 * @returns {{ daily: string, weekly: string, monthly: string, overall: string }}
 */
const currentBoardTags = () => {
  const date = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
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

/**
 * The name the leaderboard shows for a stored user. Mirrors Scores.getScores, fallbacks included.
 */
const displayNameOf = (user) => (user && (user.displayName || (user.firstName + user.lastName) || user.firstName)) || STRINGS.unknownUser;

const userIdOf = (user) => (user && (user._id || user.id || user.userId)) || null;

/**
 * The scores stored on one board, best first; a board nobody scored on yet holds none.
 * @param {string} tag
 * @param {function(Error=, Array=)} callback - (error, topScores)
 */
const readBoard = (tag, callback) => {
  buildfire.publicData.get(tag, (error, record) => {
    if (error) return callback(error, undefined);
    const topScores = record && record.data && Array.isArray(record.data.topScores) ? record.data.topScores : [];
    callback(null, topScores);
  });
};

/**
 * A user's score on a board, 0 when they are not on it. Mirrors widgetController.addEditUserScore.
 */
const scoreOn = (topScores, userId) => {
  const entry = topScores.find((score) => userIdOf(score.user) === userId);
  return (entry && entry.score) || 0;
};

/**
 * The users the auth directory answers for one email, whatever list shape it answers in.
 */
const usersFrom = (answer) => {
  if (Array.isArray(answer)) return answer.filter(Boolean);
  if (answer && Array.isArray(answer.result)) return answer.result.filter(Boolean);
  return [];
};

/**
 * The app user a caller named, by id or by email: a value with an @ is an email, looked up in the app's users; anything else is an id, looked up as a public profile. A name that matches nobody is refused.
 * @param {string} value - a user id or an email
 * @param {function(Error=, object=)} callback - (error, user with _id and id set)
 */
const resolveUser = (value, callback) => {
  const withIds = (user) => {
    const resolved = { ...user };
    if (!resolved._id) resolved._id = userIdOf(user);
    // Mirrors the Scoreboard component's logScore, which keys every entry by user.id.
    if (!resolved.id && resolved._id) resolved.id = resolved._id;
    return resolved;
  };
  if (value.includes('@')) {
    buildfire.auth.getUsersByEmail({ emails: [value] }, (error, answer) => {
      if (error) return callback(error, undefined);
      const found = usersFrom(answer).filter((user) => userIdOf(user));
      if (!found.length) return callback(new Error(`No user with the email "${value}"`), undefined);
      if (found.length > 1) return callback(new Error(`${found.length} users have the email "${value}"`), undefined);
      callback(null, withIds(found[0]));
    });
    return;
  }
  buildfire.auth.getUserProfile({ userId: value }, (error, user) => {
    if (error || !userIdOf(user)) {
      return callback(new Error(`No user with the id "${value}"${error ? `: ${(error && error.message) || error}` : ''}`), undefined);
    }
    callback(null, withIds(user));
  });
};

/**
 * The settings with the plugin's defaults applied. Mirrors widget/global/js/models/Setting.js, which is also the exact shape the control panel saves.
 */
const toSettings = (data) => ({
  features: data.features || [],
  notificationsFrequency: data.notificationsFrequency || [],
  userEarnPoints: data.userEarnPoints || 'HONOR_SYSTEM',
  calculateLoyaltyPoints: typeof data.calculateLoyaltyPoints === 'boolean' ? data.calculateLoyaltyPoints : false,
  isAnalyticsRegistered: typeof data.isAnalyticsRegistered === 'boolean' ? data.isAnalyticsRegistered : false,
});

/**
 * The settings an owner edits, as getSettings and updateSettings answer them: isAnalyticsRegistered is the plugin's own bookkeeping and stays private.
 */
const ownerSettings = (settings) => ({
  notificationsFrequency: settings.notificationsFrequency,
  userEarnPoints: settings.userEarnPoints,
  calculateLoyaltyPoints: settings.calculateLoyaltyPoints,
  features: settings.features,
});

const readSettings = (callback) => {
  buildfire.datastore.get(SETTINGS_TAG, (error, record) => {
    if (error) return callback(error, undefined);
    callback(null, toSettings((record && record.data) || {}));
  });
};

/**
 * Tell the open widget to refresh, as the control panel's tabs do after saving. Nothing answers it on the server, where no widget is open.
 */
const syncWithWidget = (cmd, data) => {
  if (buildfire.messaging && typeof buildfire.messaging.sendMessageToWidget === 'function') {
    buildfire.messaging.sendMessageToWidget({ cmd, data });
  }
};

/**
 * Fills a dynamic expression of the default wording (${context.plugin.<name>}) with its values, as buildfire.dynamic.expressions does on the plugin's own pages.
 */
const fillMessage = (template, values) => template.replace(/\$\{context\.plugin\.(\w+)\}/g, (match, name) => (values[name] === undefined ? match : `${values[name]}`));

/**
 * The rank change notification a board update sends. Mirrors the notification step of logScore in widget/global/services/BFGamifyComponent.js, which only sends when the push notification service is loaded (contract.html does not load it, so only a host providing it sends).
 */
const notifyRankChange = (tag, user, boardName, rankedAt, bumpedOff) => {
  const push = buildfire.notifications && buildfire.notifications.pushNotification;
  if (!push || typeof push.schedule !== 'function') return;

  const userName = displayNameOf(user);
  let title;
  let message;
  if (rankedAt === 0) {
    title = STRINGS.topRankNotificationTitle;
    message = fillMessage(STRINGS.topRankNotificationMessage, { userName, boardName });
  } else if (bumpedOff && bumpedOff.user.email !== user.email) {
    title = STRINGS.lowerRankNotificationTitle;
    message = fillMessage(STRINGS.lowerRankNotificationMessage, {
      userName,
      boardName,
      rank: bumpedOff.position,
      oldPositionUser: displayNameOf(bumpedOff.user),
    });
  }
  if (!message) return;

  Object.values(BOARD_NAMES).forEach((name) => {
    message = message.replace(name, boardName);
  });
  push.schedule({
    title,
    text: message,
    groupName: `scoreboard_${tag}`,
    sendToSelf: false,
  }, (error) => {
    if (error) console.error(error);
  });
};

/**
 * Store a user's score on one board, replacing their earlier entry. Mirrors logScore in widget/global/services/BFGamifyComponent.js as Scores.editScore calls it (overrideRecords, best first, 100 places), except its subscription of the signed-in device to the board's notifications: that belongs to the person holding the phone, not to whoever calls the contract.
 * @param {function(Error=, object=)} callback - (error, { rankedAt })
 */
const logBoardScore = (tag, user, score, boardName, isNotifyingUser, callback) => {
  const createdOn = new Date();
  const newRec = { user, score, createdOn };
  buildfire.publicData.get(tag, (error, record) => {
    if (error) return callback(error, undefined);
    const data = (record && record.data) || {};

    if (!Array.isArray(data.topScores)) {
      return buildfire.publicData.save({ gamesPlayed: 1, topScores: [newRec] }, tag, (saveError) => {
        if (saveError) return callback(saveError, undefined);
        callback(null, { rankedAt: 0 });
      });
    }

    // Kept by reference, as the component keeps them: a user bumped from the top three is marked with the place they lost.
    const previousTopThree = data.topScores.slice(0, 3);
    if (data.topScores.length > BOARD_SIZE && data.topScores[BOARD_SIZE - 1].score > score) {
      return callback(null, { rankedAt: null });
    }

    const found = data.topScores.findIndex((entry) => entry.user && entry.user.id === user.id);
    if (found < 0) data.topScores.push(newRec);
    else data.topScores[found] = newRec;
    data.topScores.sort((a, b) => b.score - a.score);

    const placeIn = (list) => list.findIndex((entry) => entry.user && entry.user.id === user.id);
    const newRank = placeIn(data.topScores.slice(0, 3));
    let bumpedOff;
    if (newRank >= 0 && newRank !== placeIn(previousTopThree)) {
      bumpedOff = previousTopThree[newRank];
      if (bumpedOff) bumpedOff.position = POSITIONS[newRank];
    }

    data.gamesPlayed += 1;
    buildfire.publicData.update(record.id, data, tag, (updateError) => {
      if (updateError) return callback(updateError, undefined);
      const rankedAt = data.topScores.indexOf(newRec);
      if (isNotifyingUser) notifyRankChange(tag, user, boardName, rankedAt, bumpedOff);
      callback(null, { rankedAt: rankedAt < 0 ? undefined : rankedAt });
    });
  });
};

/**
 * The checks of one score change, shared by updateUserScore and every entry of updateUserScoresAdvanced.
 * @returns {{ change?: { userId: string, points: number, logType: string }, error?: string }}
 */
const readScoreChange = (options) => {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) return { error: 'options must be an object' };
  if (typeof options.userId !== 'string' || !options.userId) return { error: 'Missing required parameter: userId' };
  if (options.score === undefined || options.score === null) return { error: 'Missing required parameter: score' };
  if (typeof options.score !== 'number' || !Number.isFinite(options.score)) return { error: 'score must be a number' };
  const logType = options.logType === undefined ? 'add' : options.logType;
  if (!LOG_TYPES.includes(logType)) return { error: `logType must be one of: ${LOG_TYPES.join(', ')}` };
  // The score dialog keeps whole points only: it parses what was typed with parseInt.
  return { change: { userId: options.userId, points: parseInt(String(options.score), 10), logType } };
};

/**
 * Change one user's score on every board, the way the widget's score dialog does. Mirrors widgetController.addEditUserScore: reads the user's current score on each of today's boards, adds the points to each (add) or makes them today's score and moves the week, month and overall totals by the same difference (edit), then logs each board at once, notifying on the boards the settings name. Then counts the score in analytics (add only, as the dialog does), and announces scoreUpdated, as the widget does.
 * @param {function(Error=, object=)} callback - (error, the user's new totals)
 */
const applyScoreChange = (user, change, settings, callback) => {
  const tags = currentBoardTags();
  runAll(PERIODS.map((period) => (done) => readBoard(tags[period], done)), (readError, boards) => {
    if (readError) return callback(readError, undefined);

    const current = {};
    PERIODS.forEach((period, index) => {
      current[period] = scoreOn(boards[index], user._id);
    });
    const totals = {};
    if (change.logType === 'edit') {
      ['weekly', 'monthly', 'overall'].forEach((period) => {
        totals[period] = current[period] - current.daily + change.points;
      });
      totals.daily = change.points;
    } else {
      PERIODS.forEach((period) => {
        totals[period] = current[period] + change.points;
      });
    }

    const logs = PERIODS.map((period) => (done) => logBoardScore(
      tags[period],
      user,
      parseInt(String(totals[period]), 10),
      BOARD_NAMES[period],
      settings.notificationsFrequency.includes(NOTIFICATION_FREQUENCIES[period]),
      done,
    ));
    runAll(logs, (logError) => {
      if (logError) return callback(logError, undefined);

      if (change.logType === 'add' && buildfire.analytics && typeof buildfire.analytics.trackAction === 'function') {
        buildfire.analytics.trackAction('score-logged');
      }
      if (buildfire.services && buildfire.services.contract && buildfire.services.contract.events) {
        buildfire.services.contract.events.send('scoreUpdated', {
          user: { userId: user._id, displayName: user.displayName || null, email: user.email || null },
          change: CHANGE_LABELS[change.logType],
          points: change.points,
          dailyScore: totals.daily,
          weeklyScore: totals.weekly,
          monthlyScore: totals.monthly,
          overallScore: totals.overall,
        });
      }
      callback(null, {
        userId: user._id,
        displayName: displayNameOf(user),
        dailyScore: totals.daily,
        weeklyScore: totals.weekly,
        monthlyScore: totals.monthly,
        overallScore: totals.overall,
      });
    });
  });
};

/**
 * A list of action items, as the control panel's pickers save them: every entry an action item object, and the extra field each picker requires.
 * @returns {{ items?: object[], error?: string }}
 */
const readActionList = (value, name, requiredField) => {
  if (value === null) return { items: [] };
  if (!Array.isArray(value)) return { error: `${name} must be a list of action items` };
  const bad = value.findIndex((item) => item === null || typeof item !== 'object' || Array.isArray(item)
    || typeof item[requiredField] !== 'string' || !item[requiredField]
    || (item.action !== undefined && typeof item.action !== 'string'));
  if (bad >= 0) return { error: `${name} entry ${bad} must be an action item with its ${requiredField}` };
  return { items: value };
};

widgetContract = {
  /**
   * Bind this contract to a plugin instance. Called by the consumer; resolves the iframe window that widget/control-hosted operations are proxied into.
   * @param {string} instanceId - the plugin instance to contract with.
   */
  init(instanceId) {
    buildfire.services.contract.use({ instanceId }, (err, data) => {
      if (err) return console.error('Failed to initialize Leaderboard contract', err);
      frameId = data.fid;
    });
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. Shows one of today's boards, best first, as the leaderboard drawer's tabs do (Scores.getScores): the overall board when no period is given. A board is one publicData record whose tag is computed from today's date, which is why this is a function rather than a declarative get. A user named by email is looked up first; an id filters directly. Uses only buildfire.publicData and buildfire.auth, the same in both frames and on the server; it only reads, so nothing about it needs to be watched: Background in both frames.
   * @param {{ period?: string, userId?: string }} options
   * @param {function(Error=, object=)} callback - (error, { scores })
   */
  listScores(options, callback) {
    if (!requireStringParams(options, [], callback)) return;
    const period = options.period === undefined ? 'overall' : options.period;
    if (!PERIODS.includes(period)) return callback(new Error(`period must be one of: ${PERIODS.join(', ')}`), undefined);
    if (options.userId !== undefined && (typeof options.userId !== 'string' || !options.userId)) {
      return callback(new Error('userId must be a user id or an email'), undefined);
    }

    const list = (onlyUserId) => readBoard(currentBoardTags()[period], (error, topScores) => {
      if (error) return callback(error, undefined);
      const pictureOf = (userId) => (typeof buildfire.auth.getUserPictureUrl === 'function' ? buildfire.auth.getUserPictureUrl({ userId }) : null);
      const scores = topScores
        .map((entry, index) => ({
          rank: index + 1,
          userId: userIdOf(entry.user),
          displayName: displayNameOf(entry.user),
          score: entry.score,
          imageUrl: pictureOf(userIdOf(entry.user)),
          createdOn: entry.createdOn,
        }))
        .filter((entry) => !onlyUserId || entry.userId === onlyUserId);
      callback(null, { scores });
    });

    if (options.userId && options.userId.includes('@')) {
      return resolveUser(options.userId, (error, user) => {
        if (error) return callback(error, undefined);
        list(user._id);
      });
    }
    list(options.userId);
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. Adds points to a user's score on every board, or sets their score for today, on behalf of the app (applyScoreChange). The user is named by id or email and resolved first. Multi-step over the SDK: it reads the settings and today's four boards, then writes each board from what it read, which is why it is not a declarative operation. Uses only buildfire.datastore (read), buildfire.publicData and buildfire.auth, which behave the same in both frames and on the server. Background in both frames: in a frame it reaches nobody, since contract.html loads no push notification service; on a host that provides one, a rank change may notify the board's followers, which the dangerous flag puts before the app owner.
   * @param {{ userId: string, score: number, logType?: string }} options
   * @param {function(Error=, object=)} callback - (error, the user's new totals)
   */
  updateUserScore(options, callback) {
    if (typeof callback !== 'function') throw new TypeError('callback must be a function');
    const { change, error } = readScoreChange(options);
    if (error) return callback(new Error(error), undefined);

    resolveUser(change.userId, (userError, user) => {
      if (userError) return callback(userError, undefined);
      readSettings((settingsError, settings) => {
        if (settingsError) return callback(settingsError, undefined);
        applyScoreChange(user, change, settings, callback);
      });
    });
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. usage: advanced (batches are never basic). The batch form of updateUserScore: checks every entry and finds every user before changing anything, refuses a user listed twice, then applies each entry in turn through applyScoreChange, so every user gets exactly what updateUserScore does. One at a time, since several entries write the same boards. A failed write is reported per entry; it does not stop the rest. Same hosts and reasons as updateUserScore.
   * @param {{ scores: Array<{ userId: string, score: number, logType?: string }> }} options
   * @param {function(Error=, object=)} callback - (error, { scores, succeeded, failed })
   */
  updateUserScoresAdvanced(options, callback) {
    if (typeof callback !== 'function') throw new TypeError('callback must be a function');
    const entries = options && options.scores;
    if (!Array.isArray(entries) || entries.length < 1 || entries.length > 50) {
      return callback(new Error('scores must be a list of 1 to 50 entries'), undefined);
    }

    const changes = [];
    const invalid = [];
    entries.forEach((entry, index) => {
      const { change, error } = readScoreChange(entry);
      if (error) invalid.push(`entry ${index}: ${error}`);
      else changes[index] = change;
    });
    if (invalid.length) return callback(new Error(`Invalid entries in scores: ${invalid.join('; ')}`), undefined);

    const users = [];
    const unknown = [];
    let pending = changes.length;
    const applyAll = () => {
      if (unknown.length) return callback(new Error(`Not found: ${unknown.join('; ')}`), undefined);
      const ids = users.map((user) => user._id);
      if (new Set(ids).size !== ids.length) return callback(new Error('The same user is listed more than once in scores'), undefined);

      readSettings((settingsError, settings) => {
        if (settingsError) return callback(settingsError, undefined);
        const results = [];
        const applyNext = (index) => {
          if (index === changes.length) {
            const failed = results.filter((result) => result.error).length;
            return callback(null, { scores: results, succeeded: results.length - failed, failed });
          }
          applyScoreChange(users[index], changes[index], settings, (applyError) => {
            results.push({ index, id: applyError ? null : users[index]._id, error: applyError ? ((applyError && applyError.message) || `${applyError}`) : null });
            applyNext(index + 1);
          });
        };
        applyNext(0);
      });
    };
    changes.forEach((change, index) => {
      resolveUser(change.userId, (userError, user) => {
        if (userError) unknown.push(`entry ${index}: ${userError.message}`);
        else users[index] = user;
        pending -= 1;
        if (!pending) applyAll();
      });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Clears today's daily, weekly, monthly and overall boards, as the settings tab's Reset button does (Scores.reset: each board saved back empty, one after the other), then tells the widget to reload. Uses only buildfire.publicData, so it runs the same on the server. No widget host: only the app owner resets the leaderboard. Background: the control panel asks before resetting, but a caller of the contract has already decided, and the dangerous flag makes the MCP server ask the owner; it publishes nothing and contacts no one.
   * @param {object} options - takes no options.
   * @param {function(Error=, object=)} callback - (error, { cleared })
   */
  resetLeaderboard(options, callback) {
    if (typeof callback !== 'function') throw new TypeError('callback must be a function');
    const tags = currentBoardTags();
    const resetNext = (index) => {
      if (index === PERIODS.length) {
        syncWithWidget('reset');
        return callback(null, { cleared: PERIODS.slice() });
      }
      buildfire.publicData.save({ gamesPlayed: 0, topScores: [] }, tags[PERIODS[index]], (error) => {
        if (error) return callback(error, undefined);
        resetNext(index + 1);
      });
    };
    resetNext(0);
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: basic. The settings as the settings tab loads them, with the plugin's defaults (Setting model) where nothing is saved yet. Defaults are applied in code, which is why this is a function rather than a declarative get. Uses only buildfire.datastore, the same on the server. No widget host: settings belong to the app owner. Background: it only reads.
   * @param {object} options - takes no options.
   * @param {function(Error=, object=)} callback - (error, settings)
   */
  getSettings(options, callback) {
    if (typeof callback !== 'function') throw new TypeError('callback must be a function');
    readSettings((error, settings) => {
      if (error) return callback(error, undefined);
      callback(null, ownerSettings(settings));
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: basic. Changes the settings the way the settings tab does: only the settings passed change. Each notification checkbox adds its rank change to notificationsFrequency or takes it out, as the checkbox handlers do; features replaces the questionnaire list, each entry numbered by its position in order, as the feature list's add handler numbers them. The tab saves the whole Setting with datastore.save, so this reads, merges and saves through the same call, then sends the widget the 'settings' message, as the tab does. No widget host: app users must not change the owner's configuration. Background: it changes configuration, it does not publish to or contact anyone.
   * @param {{ notifyOnDailyChange?: boolean, notifyOnWeeklyChange?: boolean, notifyOnMonthlyChange?: boolean, notifyOnOverallChange?: boolean, userEarnPoints?: string, calculateLoyaltyPoints?: boolean, features?: object[]|null }} options
   * @param {function(Error=, object=)} callback - (error, saved settings)
   */
  updateSettings(options, callback) {
    if (!requireStringParams(options, [], callback)) return;

    const toggles = {
      notifyOnDailyChange: NOTIFICATION_FREQUENCIES.daily,
      notifyOnWeeklyChange: NOTIFICATION_FREQUENCIES.weekly,
      notifyOnMonthlyChange: NOTIFICATION_FREQUENCIES.monthly,
      notifyOnOverallChange: NOTIFICATION_FREQUENCIES.overall,
    };
    const toggleNames = Object.keys(toggles).filter((name) => options[name] !== undefined);
    const wrongToggle = toggleNames.find((name) => typeof options[name] !== 'boolean');
    if (wrongToggle) return callback(new Error(`${wrongToggle} must be true or false`), undefined);
    if (options.calculateLoyaltyPoints !== undefined && typeof options.calculateLoyaltyPoints !== 'boolean') {
      return callback(new Error('calculateLoyaltyPoints must be true or false'), undefined);
    }
    if (options.userEarnPoints !== undefined && !EARN_POINTS.includes(options.userEarnPoints)) {
      return callback(new Error(`userEarnPoints must be one of: ${EARN_POINTS.join(', ')}`), undefined);
    }
    let features;
    if (options.features !== undefined) {
      const { items, error } = readActionList(options.features, 'features', 'instanceId');
      if (error) return callback(new Error(error), undefined);
      features = items.map((item, index) => ({ ...item, order: index }));
    }
    if (!toggleNames.length && options.calculateLoyaltyPoints === undefined && options.userEarnPoints === undefined && !features) {
      return callback(new Error('Pass at least one setting to change'), undefined);
    }

    readSettings((readError, settings) => {
      if (readError) return callback(readError, undefined);

      let frequencies = settings.notificationsFrequency.slice();
      toggleNames.forEach((name) => {
        const frequency = toggles[name];
        if (!options[name]) frequencies = frequencies.filter((value) => value !== frequency);
        else if (!frequencies.includes(frequency)) frequencies.push(frequency);
      });
      const changed = toSettings({
        ...settings,
        notificationsFrequency: frequencies,
        userEarnPoints: options.userEarnPoints === undefined ? settings.userEarnPoints : options.userEarnPoints,
        calculateLoyaltyPoints: options.calculateLoyaltyPoints === undefined ? settings.calculateLoyaltyPoints : options.calculateLoyaltyPoints,
        features: features || settings.features,
      });

      buildfire.datastore.save(changed, SETTINGS_TAG, (saveError) => {
        if (saveError) return callback(saveError, undefined);
        syncWithWidget('settings', changed);
        callback(null, ownerSettings(changed));
      });
    });
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. usage: basic. The introduction the widget shows behind the leaderboard: the carousel (saved with the datastore's default tag, as Carousels.get reads it) and the description (wysContent). Two reads, which is why this is a function. Uses only buildfire.datastore, which reads the same in both frames and on the server; it only reads: Background in both frames.
   * @param {object} options - takes no options.
   * @param {function(Error=, object=)} callback - (error, { carouselItems, description })
   */
  getIntroduction(options, callback) {
    if (typeof callback !== 'function') throw new TypeError('callback must be a function');
    buildfire.datastore.get((carouselError, carousel) => {
      if (carouselError) return callback(carouselError, undefined);
      buildfire.datastore.get(DESCRIPTION_TAG, (descriptionError, description) => {
        if (descriptionError) return callback(descriptionError, undefined);
        callback(null, {
          carouselItems: (carousel && carousel.data && carousel.data.carouselItems) || [],
          description: (description && description.data && description.data.content) || '',
        });
      });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: basic. Replaces the carousel the way the content tab's carousel editor does after each add, delete, edit or reorder: the whole list saved with Carousels.save (the datastore's default tag), then the 'carousel' message to the widget. null or [] empties it, as deleting every image does. Carousel entries have no name or id of their own, so they are changed as one ordered list. No widget host: content belongs to the app owner. Background: an owner content edit, not a publication to watch.
   * @param {{ carouselItems: object[]|null }} options
   * @param {function(Error=, object=)} callback - (error, { carouselItems })
   */
  updateCarousel(options, callback) {
    if (!requireStringParams(options, [], callback)) return;
    if (options.carouselItems === undefined) return callback(new Error('Missing required parameter: carouselItems'), undefined);
    const { items, error } = readActionList(options.carouselItems, 'carouselItems', 'iconUrl');
    if (error) return callback(new Error(error), undefined);

    buildfire.datastore.save({ carouselItems: items }, (saveError) => {
      if (saveError) return callback(saveError, undefined);
      syncWithWidget('carousel', items);
      callback(null, { carouselItems: items });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: basic. Replaces the description the way the content tab's rich text editor does: saved as the Wysiwyg model (wysContent), then the 'wysiwyg' message to the widget. null or '' empties it, stored as '' as the model stores an emptied editor. The HTML is stored as given: the editor's save does no sanitizing. No widget host: content belongs to the app owner. Background: an owner content edit, not a publication to watch.
   * @param {{ description: string|null }} options
   * @param {function(Error=, object=)} callback - (error, { description })
   */
  updateDescription(options, callback) {
    if (!requireStringParams(options, [], callback)) return;
    if (options.description === undefined) return callback(new Error('Missing required parameter: description'), undefined);
    if (options.description !== null && typeof options.description !== 'string') {
      return callback(new Error('description must be text, null or an empty string'), undefined);
    }
    const content = options.description || '';

    buildfire.datastore.save({ content }, DESCRIPTION_TAG, (error) => {
      if (error) return callback(error, undefined);
      syncWithWidget('wysiwyg', content);
      callback(null, { description: content });
    });
  },
};

/**
 * What the control panel's frame (control/contract.html) dispatches to: init plus every function whose hosts include controlBackground, in plugin.contract.json order. The implementations are widgetContract's own.
 */
controlContract = {
  init: widgetContract.init,
  listScores: widgetContract.listScores,
  updateUserScore: widgetContract.updateUserScore,
  updateUserScoresAdvanced: widgetContract.updateUserScoresAdvanced,
  resetLeaderboard: widgetContract.resetLeaderboard,
  getSettings: widgetContract.getSettings,
  updateSettings: widgetContract.updateSettings,
  getIntroduction: widgetContract.getIntroduction,
  updateCarousel: widgetContract.updateCarousel,
  updateDescription: widgetContract.updateDescription,
};
