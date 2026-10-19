const LOCALES = Object.freeze(['en', 'vi', 'ja']);
const identity = session => session && JSON.stringify([session.uid, session.role, session.authzVersion]);

/** One content locale per authenticated workspace. Drafts and credentials never enter this store. */
export function createContentLocaleSession({getSession}) {
  const owner = identity(getSession());
  const participants = new Set();
  let locale = 'en';
  let busy = false;
  let disposed = false;
  const active = () => !disposed && owner && owner === identity(getSession());

  return Object.freeze({
    get: () => active() ? locale : 'en',
    register(participant) {
      if (!active()) return () => {};
      participants.add(participant);
      return () => participants.delete(participant);
    },
    async select(next) {
      if (!active() || !LOCALES.includes(next) || busy) return false;
      if (next === locale) return true;
      busy = true;
      try {
        // No locale is changed until every editor resolves dirty or uncertain writes.
        for (const participant of participants) {
          if (!await participant.requestTransition(`locale:${next}`) || !active()) return false;
        }
        locale = next;
        let loaded = true;
        for (const participant of participants) {
          if (!active()) return false;
          if (await participant.sync(next) === false) loaded = false;
        }
        return !!active() && loaded;
      } finally { busy = false; }
    },
    destroy() { disposed = true; locale = 'en'; participants.clear(); },
  });
}

/** Mount-owned adapter: hidden editors read the session locale when they become active. */
export function bindContentLocale(session, {requestTransition, isActive, state, load}) {
  const sync = async next => {
    const current = state();
    if (isActive() && !current.pending && !current.intent && (!current.record || current.locale !== next)) {
      return load(next);
    }
    return true;
  };
  const unregister = session?.register({requestTransition, sync}) ?? (() => {});
  return {
    get: () => session?.get() ?? state().locale,
    select: next => session ? session.select(next) : Promise.resolve(requestTransition(`locale:${next}`)).then(ok => ok ? load(next) : false),
    sync: () => session ? sync(session.get()) : Promise.resolve(true),
    destroy: unregister,
  };
}
